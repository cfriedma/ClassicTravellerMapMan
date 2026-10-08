import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QueuedKeyValueStore } from './key-value-store';

export class HttpStore extends QueuedKeyValueStore {
  constructor(private readonly http: HttpClient) {
    super();
  }

  getItem(key: string): Promise<string | null> {
    return this.enqueue(async () => {
      try {
        const body = await firstValueFrom(
          this.http.get<unknown>(this.url(key))
        );
        return JSON.stringify(body);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return null;
        }
        throw error;
      }
    });
  }

  setItem(key: string, value: string): Promise<void> {
    return this.enqueue(async () => {
      await firstValueFrom(this.http.put(this.url(key), JSON.parse(value)));
    });
  }

  removeItem(key: string): Promise<void> {
    return this.enqueue(async () => {
      await firstValueFrom(this.http.delete(this.url(key)));
    });
  }

  private url(key: string): string {
    return `/api/kv/${encodeURIComponent(key)}`;
  }
}
