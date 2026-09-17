'use strict';

/** KEC XML v3.0 구조의 테스트용 세금계산서 XML 생성기 */
function buildInvoiceXml(options = {}) {
  const {
    prefix = '',
    invoiceId = '202509160000000000000001',
    typeCode = '01',
    issueDateTime = '20250916120000',
    sellerId = '123-45-67890',
    sellerName = '판매자상사',
    buyerId = '987-65-43210',
    buyerName = '구매자상사',
    supplyAmount = '1000000',
    taxAmount = '100000',
    items = [
      {
        name: '컨설팅',
        description: '9월분',
        quantity: '1',
        unitPrice: '1000000',
        lineTotal: '1000000',
        lineTax: '100000',
      },
    ],
  } = options;

  const p = prefix ? prefix + ':' : '';
  const ns = prefix ? ` xmlns:${prefix}="urn:kec:tax:3.0"` : '';

  const lineItems = items
    .map(
      (item) => `
    <${p}IncludedSupplyChainTradeLineItem>
      <${p}SpecifiedTradeProduct>
        <${p}Name>${item.name}</${p}Name>
        <${p}Description>${item.description}</${p}Description>
      </${p}SpecifiedTradeProduct>
      <${p}SpecifiedLineTradeAgreement>
        <${p}GrossPriceProductTradePrice>
          <${p}ChargeAmount>${item.unitPrice}</${p}ChargeAmount>
        </${p}GrossPriceProductTradePrice>
      </${p}SpecifiedLineTradeAgreement>
      <${p}SpecifiedLineTradeDelivery>
        <${p}BilledQuantity>${item.quantity}</${p}BilledQuantity>
      </${p}SpecifiedLineTradeDelivery>
      <${p}SpecifiedLineTradeSettlement>
        <${p}ApplicableTradeTax>
          <${p}CalculatedAmount>${item.lineTax}</${p}CalculatedAmount>
        </${p}ApplicableTradeTax>
        <${p}SpecifiedTradeSettlementLineMonetarySummation>
          <${p}LineTotalAmount>${item.lineTotal}</${p}LineTotalAmount>
        </${p}SpecifiedTradeSettlementLineMonetarySummation>
      </${p}SpecifiedLineTradeSettlement>
    </${p}IncludedSupplyChainTradeLineItem>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<${p}TaxInvoice${ns}>
  <${p}ExchangedDocument>
    <${p}ID>${invoiceId}</${p}ID>
    <${p}TypeCode>${typeCode}</${p}TypeCode>
    <${p}IssueDateTime>${issueDateTime}</${p}IssueDateTime>
  </${p}ExchangedDocument>
  <${p}SupplyChainTradeTransaction>
    <${p}ApplicableHeaderTradeAgreement>
      <${p}SellerTradeParty>
        <${p}ID>${sellerId}</${p}ID>
        <${p}Name>${sellerName}</${p}Name>
      </${p}SellerTradeParty>
      <${p}BuyerTradeParty>
        <${p}ID>${buyerId}</${p}ID>
        <${p}Name>${buyerName}</${p}Name>
      </${p}BuyerTradeParty>
    </${p}ApplicableHeaderTradeAgreement>
    <${p}ApplicableHeaderTradeSettlement>
      <${p}SpecifiedTradeSettlementMonetarySummation>
        <${p}TaxBasisTotalAmount>${supplyAmount}</${p}TaxBasisTotalAmount>
        <${p}TaxTotalAmount>${taxAmount}</${p}TaxTotalAmount>
      </${p}SpecifiedTradeSettlementMonetarySummation>
    </${p}ApplicableHeaderTradeSettlement>${lineItems}
  </${p}SupplyChainTradeTransaction>
</${p}TaxInvoice>`;
}

function toBuffer(options) {
  return Buffer.from(buildInvoiceXml(options), 'utf-8');
}

module.exports = { buildInvoiceXml, toBuffer };
