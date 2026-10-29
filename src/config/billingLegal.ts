// Publish only after the owner supplies actual details and approves final documents.
// Draft texts live in docs/billing/legal/, which is not a public asset directory.
export const billingLegal: { approved: boolean; version: string; documents: Record<string, { title: string; text: string }> } = {
  approved: false,
  version: 'epay-draft-2026-10-27',
  documents: {
    offer: { title: 'Публичная оферта', text: '' },
    refunds: { title: 'Оплата, предоставление доступа и возвраты', text: '' },
    recurring: { title: 'Условия автоматического продления', text: '' },
    privacy: { title: 'Обработка данных при оплате', text: '' },
    seller: { title: 'Сведения о продавце и контакты', text: '' },
  },
}
export const billingLegalPublished = () => billingLegal.approved && !billingLegal.version.includes('draft') && Object.values(billingLegal.documents).every(d => d.text.trim().length > 0)
