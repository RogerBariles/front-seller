import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="container">
      <h1>Administración</h1>
      <mat-card>
        <mat-card-content>
          <p>Sección en desarrollo</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container { padding: 0; }
  `]
})
export class AdministracionComponent {}
