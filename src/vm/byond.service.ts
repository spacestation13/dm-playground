import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SharedLock } from '../utils/sharedLock';
import { CommandQueueService } from './commandQueue.service';
import { EmulatorService } from './emulator.service';

export enum VersionStatus {
  Fetching,
  Fetched,
  Loading,
  Loaded,
}

@Injectable({
  providedIn: 'root',
})
export class ByondService {
  public latestVersion: Promise<{ beta?: string; stable: string }>;
  private lock = new SharedLock();

  private _activeVersion: string | null = null;
  public get activeVersion() {
    return this._activeVersion;
  }

  public deleteVersion = this.lock.wrap(async (version: string) => {
    const installs = await this.getByondFolder();
    await installs.removeEntry(version.toString());
    this._versions.delete(version.toString());
    await this.commandQueueService.runToCompletion(
      '/bin/rm',
      `-rf\0/var/lib/byond/${version}.zip\0/mnt/host/byond/${version}`,
    );
    if (this._activeVersion === version) this._activeVersion = null;
  });

  private _versions = new Map<string, VersionStatus>();

  public get versions(): ReadonlyMap<string, VersionStatus> {
    return this._versions;
  }

  public load = this.lock.wrap(async (version: string, setActive?: boolean) => {
    setActive ??= true;

    const status = this._versions.get(version);
    if (status == null || status < VersionStatus.Fetched) return;

    let destination = `/mnt/host/byond/${version}`;
    if (status < VersionStatus.Loaded) {
      if (setActive) {
        destination = '/var/lib/byond_staging';
      }
      try {
        this._versions.set(version, VersionStatus.Loading);
        const zipFile = await this.getVersion(version, true);
        await this.emulatorService.sendFile(
          `byond/${version}.zip`,
          new Uint8Array(await zipFile.arrayBuffer()),
        );
        await this.commandQueueService.runToSuccess([
          `/bin/unzip /mnt/host/byond/${version}.zip 'byond/bin*' -j -d ${destination}`,
          `/bin/rm /mnt/host/byond/${version}.zip`,
        ]);
        this._versions.set(version, VersionStatus.Loaded);
      } catch (e) {
        this._versions.set(version, VersionStatus.Fetched);
        await this.commandQueueService.runToCompletion(
          '/bin/rm',
          `-rf\0${destination}`,
        );
        throw e;
      }
    }
    if (setActive) {
      if (this._activeVersion)
        await this.commandQueueService.runToSuccess(
          '/bin/mv',
          `/var/lib/byond\0/mnt/host/byond/${this._activeVersion}`,
        );
      await this.commandQueueService.runToSuccess(
        '/bin/mv',
        `${destination}\0/var/lib/byond`,
      );
    }
    this._activeVersion = version;
  });
  public getVersion = this.lock.wrap(async (version: string) => {
    try {
      const installs = await this.getByondFolder();
      const handle = await installs.getFileHandle(version.toString(), {
        create: true,
      });
      const readHandle = await handle.getFile();
      if (readHandle.size != 0) return readHandle;

      this._versions.set(version.toString(), VersionStatus.Fetching);
      const major = version.split('.')[0];
      const zipFile = await firstValueFrom(
        this.httpClient.get(
          `https://www.byond.com/download/build/${major}/${version}_byond_linux.zip`,
          { responseType: 'blob' },
        ),
      );
      const writeHandle = await handle.createWritable();
      await writeHandle.write(zipFile);
      this._versions.set(version.toString(), VersionStatus.Fetched);
      await writeHandle.close();
      return new File([zipFile], version);
    } catch (e) {
      void this.deleteVersion(version);
      this._versions.delete(version.toString());
      throw e;
    }
  });

  constructor(
    private httpClient: HttpClient,
    private commandQueueService: CommandQueueService,
    private emulatorService: EmulatorService,
  ) {
    this.latestVersion = firstValueFrom(
      httpClient.get('https://secure.byond.com/download/version.txt', {
        responseType: 'text',
      }),
    ).then((x) => {
      const [stable, beta] = x.split('\n').filter((x) => x);
      return { stable, beta };
    });
    void this.lock.run(async () => {
      for await (const version of (await this.getByondFolder()).keys()) {
        this._versions.set(version, VersionStatus.Fetched);
      }
    });
    void this.lock.run(() =>
      commandQueueService.runToSuccess('/bin/mkdir', '-p\0/mnt/host/byond'),
    );
  }

  private async getByondFolder() {
    const opfs = await navigator.storage.getDirectory();
    return await opfs.getDirectoryHandle('byond', { create: true });
  }

  public useActive<T extends (path: string | null) => any>(fn: T) {
    this.lock.run(() => fn(this._activeVersion ? `/var/lib/byond/` : null));
  }
}
