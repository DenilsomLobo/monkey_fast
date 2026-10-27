import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  startRun: vi.fn(), buildLevel: vi.fn(), toast: vi.fn(),
  loading: { progress: vi.fn(), remove: vi.fn() },
}));
vi.mock('../src/services/rankingService.js', () => ({ startRun: mocks.startRun }));
vi.mock('../src/core/levelGenerator.js', () => ({ buildLevel: mocks.buildLevel }));
vi.mock('../src/ui/screens.js', () => ({ showLoading: () => mocks.loading }));
vi.mock('../src/ui/dom.js', () => ({ clearUI: vi.fn(), toast: mocks.toast }));
vi.mock('../src/systems/AudioManager.js', () => ({ AudioManager: { unlock: vi.fn() } }));
import { startGame } from '../src/scenes/flow.js';

describe('botão Jogar', () => {
  let manager;
  beforeEach(() => {
    vi.clearAllMocks();
    manager = { isActive: key => key === 'Menu', isPaused: () => false, stop: vi.fn(), start: vi.fn() };
    mocks.startRun.mockResolvedValue({ seed: 42, mode: 'local' });
    mocks.buildLevel.mockReturnValue({ bananas: [] });
  });

  it('prepara a fase antes de trocar o menu pelo jogo', async () => {
    mocks.buildLevel.mockImplementation(() => {
      expect(manager.stop).not.toHaveBeenCalled();
      return { bananas: [] };
    });
    await startGame({ scene: { manager } }, 'Tester');
    expect(manager.start).toHaveBeenCalledWith('Game', {
      name: 'Tester', run: { seed: 42, mode: 'local' }, level: { bananas: [] },
    });
  });

  it('volta ao menu com aviso se a preparação falhar', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.buildLevel.mockImplementation(() => { throw new Error('falha de preparação'); });
    try {
      await startGame({ scene: { manager } }, 'Tester');
      expect(manager.start).toHaveBeenCalledWith('Menu', undefined);
      expect(manager.start).not.toHaveBeenCalledWith('Game', expect.anything());
      expect(mocks.toast).toHaveBeenCalled();
      expect(mocks.loading.remove).toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
