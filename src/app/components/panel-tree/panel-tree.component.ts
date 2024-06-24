import { Component, Input } from '@angular/core';
import { AngularSplitModule, IAreaSize } from 'angular-split';
import { Panel, PanelComponent } from '../panel/panel.component';
import { RecursiveOmit } from '../../../types/utils';
import { ShellService } from '../../service/shell.service';

@Component({
  selector: 'app-panel-tree',
  standalone: true,
  imports: [AngularSplitModule, PanelComponent],
  templateUrl: './panel-tree.component.html',
  styleUrl: './panel-tree.component.scss',
})
export class PanelTreeComponent {
  @Input({ required: true })
  public panelTree!: PanelTreeOrRoot;

  constructor(private shellService: ShellService) {}

  protected resizeChildren(sizes: IAreaSize[]) {
    if (this.panelTree.type != 'branch') throw new Error('Illegal state');

    this.panelTree.children.forEach((child, idx) => (child.size = sizes[idx]));
    void this.shellService.save();
  }
}

export type PanelTreeRoot = PanelTreeOrRoot & {
  nextBranchId: number;
  version: number;
};
export type PanelTreeOrRoot = RecursiveOmit<PanelTree, 'size'>;
export type PanelTree = PanelTreeBranch | PanelTreeLeaf;

export interface PanelTreeNode<Type extends string> {
  type: Type;
  size: IAreaSize;
}

export interface PanelTreeBranch extends PanelTreeNode<'branch'> {
  id: number;
  split: 'vertical' | 'horizontal';
  children: PanelTree[];
}

export interface PanelTreeLeaf extends PanelTreeNode<'leaf'> {
  id: Panel;
}
