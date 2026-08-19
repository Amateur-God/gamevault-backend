import { Injectable, NotFoundException } from "@nestjs/common";
import { isNumberString } from "class-validator";

import configuration from "../../../../configuration";
import { DeveloperMetadata } from "../../developers/developer.metadata.entity";
import { GameMetadata } from "../../games/game.metadata.entity";
import { MinimalGameMetadataDto } from "../../games/minimal-game.metadata.dto";
import { GenreMetadata } from "../../genres/genre.metadata.entity";
import { PublisherMetadata } from "../../publishers/publisher.metadata.entity";
import { MetadataProvider } from "../abstract.metadata-provider.service";

/**
 * Steam metadata provider.
 *
 * Uses the public Steam storefront endpoints (no API key required) for game
 * metadata and search:
 *  - Search:      https://store.steampowered.com/api/storesearch
 *  - App details: https://store.steampowered.com/api/appdetails
 *
 * Achievement schema/state and historical playtime are imported separately by
 * the SteamImportService using the Steam Web API (which does require a key).
 * Once imported, all data is stored locally and Steam is never needed again.
 */
@Injectable()
export class SteamMetadataProviderService extends MetadataProvider {
  enabled = configuration.METADATA.STEAM.ENABLED;
  request_interval_ms = configuration.METADATA.STEAM.REQUEST_INTERVAL_MS;
  readonly slug = "steam";
  readonly name = "Steam";
  readonly priority = configuration.METADATA.STEAM.PRIORITY;

  private readonly storeSearchUrl =
    "https://store.steampowered.com/api/storesearch";
  private readonly appDetailsUrl =
    "https://store.steampowered.com/api/appdetails";

  public override async search(
    query: string,
  ): Promise<MinimalGameMetadataDto[]> {
    // Allow direct AppID lookups via search as well.
    if (isNumberString(query)) {
      try {
        const game = await this.getByProviderDataIdOrFail(query);
        return [
          {
            provider_slug: this.slug,
            provider_data_id: game.provider_data_id,
            title: game.title,
            description: game.description,
            release_date: game.release_date,
            cover_url: game.cover?.source_url,
          } as MinimalGameMetadataDto,
        ];
      } catch {
        // fall through to name search
      }
    }

    const url = `${this.storeSearchUrl}/?term=${encodeURIComponent(
      query,
    )}&cc=us&l=en`;
    const response = await this.fetchJson<{
      total: number;
      items: { id: number; name: string; tiny_image?: string }[];
    }>(url);

    const items = response?.items ?? [];
    this.logger.debug({
      message: `Found ${items.length} games on Steam`,
      query,
      count: items.length,
    });

    return items.map(
      (item) =>
        ({
          provider_slug: this.slug,
          provider_data_id: item.id?.toString(),
          title: item.name,
          cover_url: item.tiny_image,
        }) as MinimalGameMetadataDto,
    );
  }

  public override async getByProviderDataIdOrFail(
    provider_data_id: string,
  ): Promise<GameMetadata> {
    const url = `${this.appDetailsUrl}?appids=${provider_data_id}&l=english`;
    const response = await this.fetchJson<
      Record<string, { success: boolean; data?: SteamAppDetails }>
    >(url);

    const entry = response?.[provider_data_id];
    if (!entry?.success || !entry.data) {
      throw new NotFoundException(
        `Game with AppID ${provider_data_id} not found on Steam.`,
      );
    }

    return this.mapGameMetadata(entry.data);
  }

  private async mapGameMetadata(
    data: SteamAppDetails,
  ): Promise<GameMetadata> {
    return {
      provider_slug: this.slug,
      provider_data_id: data.steam_appid?.toString(),
      provider_data_url: `https://store.steampowered.com/app/${data.steam_appid}`,
      title: data.name,
      description: this.stripHtml(
        data.short_description || data.detailed_description,
      ),
      release_date: this.parseReleaseDate(data.release_date?.date),
      age_rating: data.required_age
        ? Number(data.required_age) || undefined
        : undefined,
      rating: data.metacritic?.score,
      early_access: (data.genres ?? []).some(
        (genre) => genre.description?.toLowerCase() === "early access",
      ),
      url_websites: data.website ? [data.website] : undefined,
      url_screenshots: (data.screenshots ?? []).map(
        (screenshot) => screenshot.path_full,
      ),
      url_trailers: (data.movies ?? [])
        .map((movie) => movie.mp4?.max || movie.webm?.max)
        .filter((movieUrl): movieUrl is string => Boolean(movieUrl)),
      developers: (data.developers ?? []).map(
        (developer) =>
          ({
            provider_slug: this.slug,
            provider_data_id: developer,
            name: developer,
          }) as DeveloperMetadata,
      ),
      publishers: (data.publishers ?? []).map(
        (publisher) =>
          ({
            provider_slug: this.slug,
            provider_data_id: publisher,
            name: publisher,
          }) as PublisherMetadata,
      ),
      genres: (data.genres ?? []).map(
        (genre) =>
          ({
            provider_slug: this.slug,
            provider_data_id: genre.id?.toString(),
            name: genre.description,
          }) as GenreMetadata,
      ),
      cover: await this.downloadImage(data.header_image),
      background: await this.downloadImage(
        data.background_raw || data.background,
      ),
    } as GameMetadata;
  }

  private parseReleaseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private stripHtml(value?: string): string | undefined {
    if (!value) return undefined;
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  private async downloadImage(url?: string) {
    if (!url) return undefined;
    try {
      return await this.mediaService.downloadByUrl(url);
    } catch (error) {
      this.logger.error(`Failed to download image from ${url}:`, error);
      return undefined;
    }
  }

  private async fetchJson<T>(url: string): Promise<T | undefined> {
    const response = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!response.ok) {
      this.logger.warn({
        message: "Steam request failed.",
        url,
        status: response.status,
      });
      return undefined;
    }
    return (await response.json()) as T;
  }
}

interface SteamAppDetails {
  steam_appid?: number;
  name?: string;
  short_description?: string;
  detailed_description?: string;
  required_age?: number | string;
  website?: string;
  header_image?: string;
  background?: string;
  background_raw?: string;
  release_date?: { coming_soon?: boolean; date?: string };
  developers?: string[];
  publishers?: string[];
  metacritic?: { score?: number };
  genres?: { id?: string | number; description?: string }[];
  screenshots?: { id?: number; path_full?: string }[];
  movies?: {
    mp4?: { max?: string };
    webm?: { max?: string };
  }[];
}
