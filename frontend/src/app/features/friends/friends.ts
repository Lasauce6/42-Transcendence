import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { FriendsService } from './friends.service';
import { Friendship } from './friend.models';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-friends',
  imports: [TranslatePipe],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class Friends implements OnInit {
  protected readonly friendsService = inject(FriendsService);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.friendsService.load().subscribe({
      next: (list) => {
        for (const f of list) {
          if (f.status === 'BLOCKED') continue;
          const id = this.friendsService.otherUserId(f);
          if (id) this.friendsService.loadProfile(id).subscribe();
        }
      },
      error: (e) => this.showError(e),
    });
  }

  protected profile(f: Friendship) {
    const id = this.friendsService.otherUserId(f);
    return id ? this.friendsService.profiles()[id] : undefined;
  }

  protected accept(f: Friendship) {
    this.run(this.friendsService.accept(f.id));
  }
  protected reject(f: Friendship) {
    this.run(this.friendsService.reject(f.id));
  }
  protected remove(f: Friendship) {
    this.run(this.friendsService.remove(f.id));
  }

  private run(action$: Observable<unknown>) {
    this.error.set(null);
    action$.subscribe({ error: (e) => this.showError(e) });
  }

  private showError(e: HttpErrorResponse) {
    this.error.set(e.error?.detail ?? 'Une erreur est survenue.');
  }
}
