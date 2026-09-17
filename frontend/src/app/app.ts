import { Component, signal } from '@angular/core';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Header } from "./features/header/header";
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
