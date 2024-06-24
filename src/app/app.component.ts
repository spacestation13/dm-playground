import { TuiRootModule, TuiThemeNightModule } from '@taiga-ui/core';
import { Component } from '@angular/core';
import { PanelTreeComponent } from './components/panel-tree/panel-tree.component';
import { ShellService } from './service/shell.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TuiRootModule, PanelTreeComponent, TuiThemeNightModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(protected shellService: ShellService) {}
}
