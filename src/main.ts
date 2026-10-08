import { APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { KEY_VALUE_STORE } from './app/storage/key-value-store';
import { keyValueStoreFactory } from './app/storage/storage-factory';
import { SettingsService } from './app/services/settings.service';
import { SubsectorManagerService } from './app/services/subsector-manager.service';

function hydrateApplication(
  settings: SettingsService,
  subsectors: SubsectorManagerService
): () => Promise<void> {
  return () => Promise.all([settings.hydrate(), subsectors.hydrate()]).then(() => undefined);
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: KEY_VALUE_STORE,
      useFactory: keyValueStoreFactory,
      deps: [HttpClient]
    },
    {
      provide: APP_INITIALIZER,
      useFactory: hydrateApplication,
      deps: [SettingsService, SubsectorManagerService],
      multi: true
    }
  ]
}).catch(err => console.error(err));
