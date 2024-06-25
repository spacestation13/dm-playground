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
  Extracting,
  Loaded,
}

@Injectable({
  providedIn: 'root',
})
export class ByondService {
  public latestVersion: Promise<{ beta?: string; stable: string }>;
  private lock = new SharedLock();

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
    void this.lock.run(() =>
      commandQueueService.runToSuccess(
        '/bin/mkdir',
        '-p\0/mnt/host/byond\0/var/lib/byond',
      ),
    );
    void this.lock.run(async () => {
      for await (const version of (await this.getByondFolder()).keys()) {
        this._versions.set(version, VersionStatus.Fetched);
      }
    });
  }

  private _versions = new Map<string, VersionStatus>();

  public get versions(): ReadonlyMap<string, VersionStatus> {
    return this._versions;
  }

  public deleteVersion = this.lock.wrap(async (version: string) => {
    const installs = await this.getByondFolder();
    await installs.removeEntry(version.toString());
    this._versions.delete(version.toString());
    await this.commandQueueService.runToCompletion(
      '/bin/rm',
      `-rf\0/var/lib/byond/${version}.zip\0/var/lib/byond/${version}`,
    );
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
  public setActive = this.lock.wrap(async (version: string) => {
    const status = this._versions.get(version);
    if (status == null || status < VersionStatus.Fetched) return;

    if (status < VersionStatus.Loaded) {
      try {
        this._versions.set(version, VersionStatus.Loading);
        const zipFile = await this.getVersion(version, true);
        await this.emulatorService.sendFile(
          `byond/${version}.zip`,
          new Uint8Array(await zipFile.arrayBuffer()),
        );
        this._versions.set(version, VersionStatus.Extracting);
        await this.commandQueueService.runToSuccess(
          '/bin/mv',
          `/mnt/host/byond/${version}.zip\0/var/lib/byond/`,
        );
        await this.commandQueueService.runToSuccess(
          '/bin/unzip',
          `/var/lib/byond/${version}.zip\0byond/bin*\0-j\0-d\0/var/lib/byond/${version}`,
        );
        await this.commandQueueService.runToSuccess(
          '/bin/rm',
          `/var/lib/byond/${version}.zip`,
        );
        this._versions.set(version, VersionStatus.Loaded);
      } catch (e) {
        this._versions.set(version, VersionStatus.Fetched);
        await this.commandQueueService.runToCompletion(
          '/bin/rm',
          `-rf\0/var/lib/byond/${version}.zip\0/var/lib/byond/${version}`,
        );
        throw e;
      }
    }
  });

  private async getByondFolder() {
    const opfs = await navigator.storage.getDirectory();
    return await opfs.getDirectoryHandle('byond', { create: true });
  }
}