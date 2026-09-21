import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('empile les toasts dans l’ordre d’arrivée', () => {
    service.success('A');
    service.error('B');
    service.info('C');

    expect(service.toasts().map((toast) => toast.type)).toEqual(['success', 'error', 'info']);
  });

  it('retire le toast automatiquement à la fin de sa durée', () => {
    service.info('A', {}, 3000);

    vi.advanceTimersByTime(2999);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('dismiss() retire le bon toast', () => {
    const first = service.info('A');
    service.info('B');

    service.dismiss(first);

    expect(service.toasts().map((toast) => toast.key)).toEqual(['B']);
  });

  it('une durée de 0 garde le toast affiché', () => {
    service.error('A', {}, 0);

    vi.advanceTimersByTime(60_000);

    expect(service.toasts()).toHaveLength(1);
  });

  it('ne garde que les 4 derniers toasts', () => {
    for (const key of ['A', 'B', 'C', 'D', 'E']) {
      service.info(key);
    }

    expect(service.toasts().map((toast) => toast.key)).toEqual(['B', 'C', 'D', 'E']);
  });

  it('clear() vide tout', () => {
    service.info('A');
    service.error('B');

    service.clear();

    expect(service.toasts()).toHaveLength(0);
  });
});
