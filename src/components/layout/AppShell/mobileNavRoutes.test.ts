import { describe, expect, it } from 'vitest';
import { isMobileNavScreen, mobileNavItems } from './mobileNavRoutes';

/**
 * Нижняя панель: главная, подписка, баланс, слот (колесо/рефералка) и хвост —
 * розыгрыш при raffleEnabled, иначе поддержка.
 */
describe('mobileNavItems', () => {
  it('без флагов — четыре базовых экрана (хвост = поддержка)', () => {
    expect(mobileNavItems({}).map((item) => item.path)).toEqual([
      '/',
      '/subscriptions',
      '/balance',
      '/support',
    ]);
  });

  it('с розыгрышем — хвост = розыгрыш вместо поддержки', () => {
    expect(mobileNavItems({ raffleEnabled: true }).map((item) => item.path)).toEqual([
      '/',
      '/subscriptions',
      '/balance',
      '/raffle',
    ]);
  });

  it('колесо занимает слот перед хвостом и вытесняет рефералку', () => {
    const paths = mobileNavItems({
      wheelEnabled: true,
      referralEnabled: true,
      raffleEnabled: true,
    }).map((item) => item.path);
    expect(paths).toEqual(['/', '/subscriptions', '/balance', '/wheel', '/raffle']);
  });

  it('рефералка получает слот, когда колесо выключено', () => {
    const paths = mobileNavItems({ referralEnabled: true, raffleEnabled: true }).map(
      (item) => item.path,
    );
    expect(paths).toEqual(['/', '/subscriptions', '/balance', '/referral', '/raffle']);
  });

  it('ключ пункта совпадает с ключом перевода nav.*', () => {
    expect(
      mobileNavItems({ wheelEnabled: true, raffleEnabled: true }).map((item) => item.key),
    ).toEqual(['dashboard', 'subscription', 'balance', 'wheel', 'raffle']);
  });
});

describe('isMobileNavScreen', () => {
  const items = mobileNavItems({ wheelEnabled: true, raffleEnabled: true });

  it('главная и экраны кнопок — да', () => {
    for (const path of ['/', '/subscriptions', '/balance', '/wheel', '/raffle']) {
      expect(isMobileNavScreen(path, items), path).toBe(true);
    }
  });

  it('хвостовой слеш не мешает', () => {
    expect(isMobileNavScreen('/balance/', items)).toBe(true);
  });

  it('админка и вложенные страницы — нет', () => {
    for (const path of ['/admin', '/admin/reachability', '/balance/top-up']) {
      expect(isMobileNavScreen(path, items), path).toBe(false);
    }
  });

  it('карточка подписки — да: кнопка «Подписка» приводит именно сюда', () => {
    expect(isMobileNavScreen('/subscriptions/12', items)).toBe(true);
    expect(isMobileNavScreen('/subscriptions/12/', items)).toBe(true);
  });

  it('но продление изнутри карточки — уже нет', () => {
    expect(isMobileNavScreen('/subscriptions/12/renew', items)).toBe(false);
    expect(isMobileNavScreen('/subscription/purchase', items)).toBe(false);
  });

  it('экран выключенного слота — нет', () => {
    expect(isMobileNavScreen('/referral', items)).toBe(false);
    expect(isMobileNavScreen('/wheel', mobileNavItems({}))).toBe(false);
    expect(isMobileNavScreen('/support', items)).toBe(false);
  });
});
