import { Component, computed, DestroyRef, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Channel } from '@core/models/chat.model';
import { ChatService } from '@core/services/chat';
import { ChatSocket } from '@core/services/chat-socket';
import { CurrentUser } from '@core/services/current-user';
import { UiAlert, UiAvatar, UiButton, UiEmptyState, UiFileCard, UiIcon, UiMessageBubble, UiSpinner } from '@shared/ui';

// Page d'une conversation : affiche les messages et permet d'en envoyer.
@Component({
  selector: 'app-chat-window',
  imports: [RouterLink, TranslatePipe, UiAlert, UiAvatar, UiButton, UiEmptyState, UiFileCard, UiIcon, UiMessageBubble, UiSpinner],
  providers: [ChatSocket],
  templateUrl: './chat-window.html',
})
export class ChatWindow implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
  readonly socket = inject(ChatSocket);
  readonly currentUser = inject(CurrentUser);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly draft = signal('');

  readonly channelId = signal('');
  readonly channels = this.service.channels;
  readonly channel = computed(() => this.channels().find((c) => c.id === this.channelId()));
  readonly title = computed(() => {
    const c = this.channel();
    return c ? this.service.displayName(c) : '';
  });

  // Les membres de la conversation ouverte (renvoyés par le back avec le channel).
  readonly members = computed(() => this.channel()?.members ?? []);

  displayName(c: Channel): string {
    return this.service.displayName(c);
  }

  avatarOf(c: Channel): string | null {
    return this.service.avatarOf(c);
  }

  private readonly bottom = viewChild<ElementRef<HTMLElement>>('bottom');

  readonly uploading = signal(false);
  readonly uploadError = signal(false);

  readonly memberName = signal('');
  readonly memberAdded = signal(false);
  readonly memberError = signal(false);

  // Relance le scroll vers le bas à chaque changement de la liste des messages.
  constructor() {
    effect(() => {
      this.socket.messages();
      // setTimeout : on attend que le nouveau message soit affiché avant de scroller.
      setTimeout(() => this.scrollToBottom());
    });
  }

  // Au chargement de la page, et à chaque changement de channel dans la liste :
  // ouvre le websocket du channel et récupère son historique.
  ngOnInit(): void {
    this.currentUser.load().subscribe();
    this.service.loadChannels().subscribe({ error: () => {} });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id')!;
      this.channelId.set(id);
      this.loading.set(true);
      this.error.set(false);

      this.socket.close();
      this.socket.messages.set([]);
      this.socket.open(id);

      this.service.loadMessages(id).subscribe({
        next: (history) => {
          this.socket.setHistory(history);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
    });
  }

  // Quand on quitte la page : ferme le websocket.
  ngOnDestroy(): void {
    this.socket.close();
  }

  // Dit si le message a été envoyé par l'utilisateur connecté.
  isMine(senderId: string): boolean {
    return senderId === this.currentUser.profile()?.id;
  }

  // Garde en mémoire ce que l'utilisateur tape dans le champ.
  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  // Envoie le message tapé et vide le champ si l'envoi a réussi.
  send(): void {
    if (this.socket.send(this.draft())) {
      this.draft.set('');
    }
  }

  // Descend la zone des messages tout en bas.
  private scrollToBottom(): void {
    const el = this.bottom()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  // Appelée quand l'utilisateur choisit un fichier : l'envoie dans la conversation.
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.uploading.set(true);
    this.uploadError.set(false);

    this.service.sendAttachment(id, file, this.draft()).subscribe({
      // Le message arrive tout seul par le websocket, on vide juste le champ.
      next: () => {
        this.uploading.set(false);
        this.draft.set('');
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set(true);
      },
    });

    // Remet le champ à zéro pour pouvoir renvoyer le même fichier.
    input.value = '';
  }

  // Garde en mémoire le nom tapé dans le champ "ajouter un membre".
  onMemberInput(event: Event): void {
    this.memberName.set((event.target as HTMLInputElement).value);
    this.memberAdded.set(false);
    this.memberError.set(false);
  }

  // Ajoute la personne tapée dans la conversation ouverte.
  addMember(): void {
    const username = this.memberName().trim();
    if (!username) {
      return;
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.addMemberByUsername(id, username).subscribe({
      next: () => {
        this.memberName.set('');
        this.memberAdded.set(true);
        // Recharge les channels pour que la personne ajoutée apparaisse dans la liste.
        this.service.loadChannels().subscribe({ error: () => {} });
      },
      error: () => this.memberError.set(true),
    });
  }
}
