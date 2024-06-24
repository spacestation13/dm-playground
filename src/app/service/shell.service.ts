import { Injectable } from '@angular/core';
import { PanelTreeRoot } from '../components/panel-tree/panel-tree.component';
import { CompressionService } from './compression.service';
import { Panel } from '../components/panel/panel.component';

const LOCAL_STORAGE_KEY = 'layout';

@Injectable({
  providedIn: 'root',
})
export class ShellService {
  public layout?: PanelTreeRoot;
  private defaultLayout = JSON.stringify({
    version: 0,
    nextBranchId: 3,
    id: 0,
    type: 'branch',
    split: 'vertical',
    children: [
      {
        id: 1,
        type: 'branch',
        split: 'horizontal',
        size: 70,
        children: [
          {
            id: Panel.Editor,
            type: 'leaf',
            size: 70,
          },
          {
            id: Panel.Output,
            type: 'leaf',
            size: 30,
          },
        ],
      },
      {
        id: 2,
        type: 'branch',
        split: 'horizontal',
        size: 30,
        children: [
          {
            id: Panel.Console,
            type: 'leaf',
            size: 50,
          },
          {
            id: Panel.Screen,
            type: 'leaf',
            size: 25,
          },
          {
            id: Panel.Controller,
            type: 'leaf',
            size: 25,
          },
        ],
      },
    ],
  } satisfies PanelTreeRoot);

  constructor(private compressionService: CompressionService) {
    void this.init();
  }

  public async save() {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      await this.compressionService.compress(JSON.stringify(this.layout)),
    );
  }

  private async init() {
    this.layout = JSON.parse(
      (await this.compressionService.decompress(
        localStorage.getItem(LOCAL_STORAGE_KEY) ?? '',
      )) || this.defaultLayout,
    );
  }
}
