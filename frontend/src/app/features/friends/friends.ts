import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { Observable, finalize, switchMap, tap } from 'rxjs';
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

  protected readonly loading = signal(true);
protected readonly busy = signal(false);
protected readonly newUsername = signal('');

constructor() {
  effect(() => {
    for (const f of this.friendsService.friendships()) {
      if (f.status === 'BLOCKED') continue;
      const id = this.friendsService.otherUserId(f);
      if (id) {
        untracked(() => this.friendsService.loadProfile(id).subscribe({ error: () => {} }));
      }
    }
  });
}


  ngOnInit() {
  this.friendsService
    .load()
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({ error: (e) => this.showError(e) });
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

    protected add() {
  const username = this.newUsername().trim();
  if (!username) return;
  this.run(
    this.friendsService.findUserId(username).pipe(
      switchMap((id) => this.friendsService.sendRequest(id)),
      tap(() => this.newUsername.set('')),
    ),
  );
}

  private run(action$: Observable<unknown>) {
  if (this.busy()) return;
  this.busy.set(true);
  this.error.set(null);
  action$
    .pipe(finalize(() => this.busy.set(false)))
    .subscribe({ error: (e) => this.showError(e) });
}

private showError(e: HttpErrorResponse) {
  this.error.set(e.error?.detail ?? 'ERRORS.GENERIC');
}
}
