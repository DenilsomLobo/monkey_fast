import { beforeEach, describe, it, expect, vi } from 'vitest';
import { LEVEL_VERSION } from '../src/core/constants.js';

const mocks = vi.hoisted(() => ({ getFirebase: vi.fn(), getLocalRanking: vi.fn(), setLocalRanking: vi.fn() }));
vi.mock('../src/services/firebase.js', () => ({ getFirebase: mocks.getFirebase, firebaseEnabled: false }));
vi.mock('../src/services/storage.js', () => ({ storage: mocks }));
import { getTop10, submitRun } from '../src/services/rankingService.js';

describe('ranking separado por versão da distribuição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirebase.mockResolvedValue(null);
    mocks.getLocalRanking.mockReturnValue([
      { id: 'old', levelVersion: 'v1', score: 312, timeMs: 1000 },
      { id: 'current', levelVersion: LEVEL_VERSION, score: 50, timeMs: 10000 },
    ]);
  });

  it('exibe somente os resultados locais da versão atual', async () => {
    expect((await getTop10()).entries.map(e => e.id)).toEqual(['current']);
  });

  it('calcula a posição local sem apagar resultados antigos', async () => {
    const result = await submitRun({ name: 'Tester', score: 60, timeMs: 20000, bananas: 60, powerups: 0 });
    expect(result.rank).toBe(1);
    expect(mocks.setLocalRanking.mock.calls[0][0].map(e => e.id)).toContain('old');
  });

  it('filtra a versão antes de limitar o Top 10 global', async () => {
    const where = vi.fn(() => 'version-filter');
    mocks.getFirebase.mockResolvedValue({
      db: {}, fs: {
        collection: vi.fn(), query: vi.fn(), where,
        orderBy: vi.fn(), limit: vi.fn(), getDocs: vi.fn(async () => ({ docs: [] })),
      },
    });
    expect((await getTop10()).mode).toBe('global');
    expect(where).toHaveBeenCalledWith('levelVersion', '==', LEVEL_VERSION);
  });
});
