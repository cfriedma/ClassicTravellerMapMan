import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ElectronStore } from './electron-store';
import { HttpStore } from './http-store';
import { KeyValueStore } from './key-value-store';
import { LocalStorageStore } from './local-storage-store';

export function keyValueStoreFactory(http: HttpClient): KeyValueStore {
  switch (environment.storage) {
    case 'http':
      return new HttpStore(http);
    case 'electron':
      return new ElectronStore();
    default:
      return new LocalStorageStore();
  }
}
