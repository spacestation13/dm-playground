import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ByondService {
  public latestVersion: Promise<{ beta?: ByondVersion; stable: ByondVersion }>;

  constructor(httpClient: HttpClient) {
    this.latestVersion = firstValueFrom(
      httpClient
        .get('https://secure.byond.com/download/version.txt', {
          responseType: 'text',
        })
        .pipe(
          map((x) => {
            const [stable, beta] = x
              .split('\n')
              .filter((x) => x)
              .map((x) => new ByondVersion(x));
            return { stable, beta };
          }),
        ),
    );
  }
}

export class ByondVersion {
  public readonly major: number;
  public readonly minor: number;

  constructor(version: string);
  constructor(major: number, minor: number);
  constructor(versionOrMajor: string | number, minor?: number) {
    if (typeof versionOrMajor === 'number') {
      this.major = versionOrMajor;
      this.minor = minor!;
    } else {
      console.log(versionOrMajor.split('.'));
      const [major, minor] = versionOrMajor.split('.').map((x) => parseInt(x));
      this.major = major;
      this.minor = minor;
    }
  }

  toString() {
    return `${this.major}.${this.minor}`;
  }
}
