import { Component, inject, OnInit, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { FriendsService, friendsErrorKey } from './friends.service';
import { Friendship } from './friend.models';

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

  ngOnInit() {
    this.friendsService
      .load()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: (e) => this.error.set(friendsErrorKey(e)) });
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
    this.run(this.friendsService.addByUsername(username).pipe(tap(() => this.newUsername.set(''))));
  }

  private run(action$: Observable<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    action$
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({ error: (e) => this.error.set(friendsErrorKey(e)) });
  }
}
