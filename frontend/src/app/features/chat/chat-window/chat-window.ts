import { Component, computed, DestroyRef, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpEventType } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Channel, ChatMessage } from '@core/models/chat.model';
import { ChatService } from '@core/services/chat';
import { ChatSocket } from '@core/services/chat-socket';
import { CurrentUser } from '@core/services/current-user';
import { ToastService } from '@core/services/toast';
import { UiAlert, UiAvatar, UiButton, UiEmptyState, UiFileCard, UiIcon, UiMessageBubble, UiProgress, UiSpinner } from '@shared/ui';

// Mêmes règles que le back (backend/chat/files.py) : extensions acceptées et taille max.
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.docx', '.xlsx'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

// Page d'une conversation : affiche les messages et permet d'en envoyer.
@Component({
  selector: 'app-chat-window',
  imports: [RouterLink, TranslatePipe, UiAlert, UiAvatar, UiButton, UiEmptyState, UiFileCard, UiIcon, UiMessageBubble, UiProgress, UiSpinner],
  providers: [ChatSocket],
  templateUrl: './chat-window.html',
})
export class ChatWindow implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
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

  displayName(c: Channel): string {
    return this.service.displayName(c);
  }

  avatarOf(c: Channel): string | null {
    return this.service.avatarOf(c);
  }

  private readonly bottom = viewChild<ElementRef<HTMLElement>>('bottom');

  readonly uploading = signal(false);
  readonly uploadError = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadName = signal('');
  // Clé de traduction de l'erreur de validation du fichier (type ou taille), sinon null.
  readonly fileError = signal<string | null>(null);
  readonly accept = ALLOWED_EXTENSIONS.join(',');

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

  // Vérifie le fichier avant l'envoi : renvoie la clé de l'erreur, ou null si tout va bien.
  // Le back revérifie tout (type réel du contenu, taille), ça ne sert qu'à prévenir plus vite.
  validateFile(file: File): string | null {
    const dot = file.name.lastIndexOf('.');
    const ext = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'CHAT.FILE_BAD_TYPE';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'CHAT.FILE_TOO_BIG';
    }
    return null;
  }

  // Appelée quand l'utilisateur choisit un fichier : le vérifie puis l'envoie dans la conversation.
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    // Remet le champ à zéro pour pouvoir renvoyer le même fichier.
    input.value = '';

    this.uploadError.set(false);
    this.fileError.set(this.validateFile(file));
    if (this.fileError()) {
      return;
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadName.set(file.name);

    this.service.sendAttachment(id, file, this.draft()).subscribe({
      next: (httpEvent) => {
        if (httpEvent.type === HttpEventType.UploadProgress && httpEvent.total) {
          this.uploadProgress.set(Math.round((100 * httpEvent.loaded) / httpEvent.total));
        }
        // Le message arrive tout seul par le websocket, on vide juste le champ.
        if (httpEvent.type === HttpEventType.Response) {
          this.uploading.set(false);
          this.draft.set('');
          this.toast.success('TOAST.SUCCESS.FILE_SENT');
        }
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set(true);
      },
    });
  }

  // On peut supprimer ses propres messages ; un admin ou un modérateur peut supprimer ceux des autres.
  canDelete(m: ChatMessage): boolean {
    if (m.is_deleted) {
      return false;
    }
    const role = this.currentUser.profile()?.role;
    return this.isMine(m.sender) || role === 'ADMIN' || role === 'MODERATOR';
  }

  // Supprime un message (et ses fichiers) après confirmation.
  deleteMessage(m: ChatMessage): void {
    if (!window.confirm(this.translate.instant('CHAT.CONFIRM_DELETE_MESSAGE'))) {
      return;
    }
    this.service.deleteMessage(this.channelId(), m.id).subscribe({
      next: () => {
        this.socket.markDeleted(m.id);
        this.toast.success('TOAST.SUCCESS.MESSAGE_DELETED');
      },
      error: () => {}, // l'interceptor affiche déjà un toast d'erreur
    });
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
      },
      error: () => this.memberError.set(true),
    });
  }
}
