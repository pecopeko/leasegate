import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateAsbj34LeasePv,
  auditAsbj34Lease,
  generateLeaseComplianceMarkdown,
} from '../docs/core/lease-engine.mjs';

test('evaluateAsbj34LeasePv computes annuity PV, Year-1 P/L impact, and short-term/low-value exemptions', () => {
  const onBal = evaluateAsbj34LeasePv({
    monthlyLeaseJpy: 1_200_000,
    leaseTermMonths: 36,
    annualDiscountRatePct: 1.8,
    underlyingNewValueJpy: 180_000_000,
    hasPurchaseOption: false,
    controlsIdentifiedAsset: true,
    alreadyOnBalanceSheet: false,
  });
  assert.equal(onBal.isShortTermExempt, false);
  assert.equal(onBal.isLowValueExempt, false);
  assert.equal(onBal.onBalanceRequired, true);
  assert.equal(onBal.offBalanceOmissionRisk, true);
  assert.equal(onBal.totalUndiscountedJpy, 43_200_000);
  assert.ok(onBal.leaseLiabilityPvJpy > 41_900_000 && onBal.leaseLiabilityPvJpy < 42_200_000);
  assert.ok(onBal.year1DepreciationJpy > 13_900_000 && onBal.year1DepreciationJpy < 14_100_000);
  assert.ok(onBal.year1InterestExpenseJpy > 600_000 && onBal.year1InterestExpenseJpy < 760_000);

  const shortTerm = evaluateAsbj34LeasePv({
    monthlyLeaseJpy: 500_000,
    leaseTermMonths: 12,
    underlyingNewValueJpy: 20_000_000,
    hasPurchaseOption: false,
  });
  assert.equal(shortTerm.isShortTermExempt, true);
  assert.equal(shortTerm.onBalanceRequired, false);

  const lowValue = evaluateAsbj34LeasePv({
    monthlyLeaseJpy: 45_000,
    leaseTermMonths: 36,
    underlyingNewValueJpy: 2_500_000,
  });
  assert.equal(lowValue.isLowValueExempt, true);
  assert.equal(lowValue.onBalanceRequired, false);
});

test('auditAsbj34Lease flags off-balance omissions and passes 100/100 on compliant ASBJ No. 34 policy', () => {
  const bad = auditAsbj34Lease(
    '使用権資産計上せず全額オフバランス賃貸費用処理し、契約識別せず注記省略とする。',
    {
      monthlyLeaseJpy: 1_200_000,
      leaseTermMonths: 36,
      annualDiscountRatePct: 1.8,
      underlyingNewValueJpy: 180_000_000,
      alreadyOnBalanceSheet: false,
    }
  );
  assert.equal(bad.status, 'fail');
  assert.ok(bad.findings.some((f) => f.id === 'off_balance_omission'));

  const compliantText = [
    '特定資産の識別判定により使用権資産を計上する。',
    '解約不能期間と延長オプションを確認してリース期間を決定し、追加借入利子率(IBR)で現在価値を割引計算する。',
    '短期リース（12か月以内・購入オプションなし）および少額リース（300万円以下）を契約単位判定する。',
    '倉庫専用や専用サーバーの組込リース識別を行い、保守料区分など非リース構成部分を独立価格配分する。',
    '企業会計基準第34号に基づく減価償却・加重平均割引率・満期分析を注記開示し計算根拠保存を徹底する。',
  ].join('\n');

  const good = auditAsbj34Lease(compliantText, {
    monthlyLeaseJpy: 1_200_000,
    leaseTermMonths: 36,
    annualDiscountRatePct: 1.8,
    underlyingNewValueJpy: 180_000_000,
    alreadyOnBalanceSheet: true,
  });
  assert.equal(good.score, 100);
  assert.equal(good.status, 'pass');
  assert.equal(good.findings.length, 0);

  const md = generateLeaseComplianceMarkdown(good, {
    organizationName: 'テスト商事株式会社',
    contractName: '本社8階定期借家',
  });
  assert.match(md, /ネットワーク通信: `0`回/);
  assert.match(md, /オンバランス必須対象/);
});
