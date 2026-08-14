import { estimateCostCentavos } from './cost-estimator';

describe('estimateCostCentavos', () => {
  it('mock-v1 e llama3 (local) têm custo zero', () => {
    expect(estimateCostCentavos('mock-v1', 10_000, 5_000)).toBe(0);
    expect(estimateCostCentavos('llama3', 10_000, 5_000)).toBe(0);
  });

  it('modelos reais têm custo positivo proporcional a tokens', () => {
    const custoPequeno = estimateCostCentavos('claude-sonnet-5', 10_000, 5_000);
    const custoGrande = estimateCostCentavos('claude-sonnet-5', 100_000, 50_000);
    expect(custoPequeno).toBeGreaterThan(0);
    expect(custoGrande).toBeGreaterThan(custoPequeno);
  });

  it('usa um custo de fallback conservador para modelo desconhecido', () => {
    expect(estimateCostCentavos('modelo-desconhecido-xyz', 1000, 1000)).toBeGreaterThan(0);
  });
});
