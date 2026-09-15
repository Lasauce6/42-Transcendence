import { Component, signal } from '@angular/core';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Header } from "./features/header/header";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
