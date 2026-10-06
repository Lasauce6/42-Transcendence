import { DatePipe } from '@angular/common';
import { Component, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatService } from '@core/services/chat';
import { ChatSocket } from '@core/services/chat-socket';
import { CurrentUser } from '@core/services/current-user';

// Page d'une conversation : affiche les messages et permet d'en envoyer.
@Component({
  selector: 'app-chat-window',
  imports: [DatePipe, RouterLink, TranslatePipe],
  providers: [ChatSocket],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ChatService);
  readonly socket = inject(ChatSocket);
  readonly currentUser = inject(CurrentUser);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly draft = signal('');

  private readonly bottom = viewChild<ElementRef<HTMLElement>>('bottom');

  readonly uploading = signal(false);
  readonly uploadError = signal(false);

  // Relance le scroll vers le bas à chaque changement de la liste des messages.
  constructor() {
    effect(() => {
      this.socket.messages();
      // setTimeout : on attend que le nouveau message soit affiché avant de scroller.
      setTimeout(() => this.scrollToBottom());
    });
  }

  // Au chargement de la page : ouvre le websocket et récupère l'historique.
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.currentUser.load().subscribe();
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
}
