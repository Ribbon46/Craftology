'use client';

import { Building2, User as UserIcon } from 'lucide-react';
import type { CheckoutDetails } from '@/actions/checkout';

/**
 * Invoicing + delivery details, collected on our own page rather than on
 * Stripe's. That's what allows the company (persoană juridică) branch with
 * CUI + registered office, and the optional "create my account" opt-in —
 * Stripe Checkout caps custom fields at three.
 */
export interface DetailsState extends CheckoutDetails {
  buyerType: 'individual' | 'company';
}

export const EMPTY_DETAILS: DetailsState = {
  email: '',
  fullName: '',
  phone: '',
  buyerType: 'individual',
  companyName: '',
  companyCui: '',
  companyAddress: '',
  shippingSameAsBilling: true,
  shippingAddress: '',
  createAccount: false,
};

const field =
  'w-full rounded-xl border-[1.5px] border-line-strong bg-paper px-3 py-2.5 text-ink placeholder:text-ink-faint ' +
  'focus:outline-none focus:border-clay focus:ring-2 focus:ring-clay/20 transition-colors';
const label = 'block text-sm font-medium text-ink mb-1.5';

export function CheckoutDetailsForm({
  value,
  onChange,
  signedIn,
}: {
  value: DetailsState;
  onChange: (next: DetailsState) => void;
  signedIn: boolean;
}) {
  const set = <K extends keyof DetailsState>(key: K, v: DetailsState[K]) => onChange({ ...value, [key]: v });
  const isCompany = value.buyerType === 'company';

  return (
    <section className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-4 space-y-4">
      <h2 className="font-display text-lg text-ink">Date de facturare și livrare</h2>

      <div>
        <label className={label} htmlFor="co-email">
          Email <span className="text-clay">*</span>
        </label>
        <input
          id="co-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={field}
          placeholder="nume@exemplu.ro"
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <p className="text-xs text-ink-faint mt-1.5">Aici primești confirmarea comenzii.</p>

        {/* Owner requirement: an opt-in account checkbox right under the email.
            The account is created after the payment succeeds. */}
        {!signedIn && (
          <label className="flex items-start gap-2.5 mt-3 text-sm text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-clay shrink-0"
              checked={!!value.createAccount}
              onChange={(e) => set('createAccount', e.target.checked)}
            />
            <span>
              <span className="text-ink">Creează-mi un cont</span> — după plată îți trimitem un link pentru parolă, ca
              data viitoare comanda să fie mai rapidă.
            </span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="co-name">
            Nume și prenume <span className="text-clay">*</span>
          </label>
          <input
            id="co-name"
            autoComplete="name"
            className={field}
            placeholder="Ion Popescu"
            value={value.fullName}
            onChange={(e) => set('fullName', e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="co-phone">
            Telefon <span className="text-clay">*</span>
          </label>
          <input
            id="co-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={field}
            placeholder="07xx xxx xxx"
            value={value.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
      </div>

      {/* Persoană fizică / juridică */}
      <fieldset>
        <legend className={label}>Cumperi ca</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: 'individual', icon: UserIcon, title: 'Persoană fizică' },
              { v: 'company', icon: Building2, title: 'Persoană juridică' },
            ] as const
          ).map(({ v, icon: Icon, title }) => (
            <label
              key={v}
              className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 cursor-pointer transition-colors ${
                value.buyerType === v
                  ? 'border-clay bg-clay-soft/50 text-ink'
                  : 'border-line-strong text-ink-soft hover:border-clay/50'
              }`}
            >
              <input
                type="radio"
                name="buyer-type"
                className="sr-only"
                checked={value.buyerType === v}
                onChange={() => set('buyerType', v)}
              />
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {isCompany && (
        <div className="space-y-3 rounded-xl border border-line bg-cream/60 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="co-company">
                Nume firmă <span className="text-clay">*</span>
              </label>
              <input
                id="co-company"
                autoComplete="organization"
                className={field}
                placeholder="Exemplu SRL"
                value={value.companyName ?? ''}
                onChange={(e) => set('companyName', e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="co-cui">
                CUI <span className="text-clay">*</span>
              </label>
              <input
                id="co-cui"
                className={field}
                placeholder="RO12345678"
                value={value.companyCui ?? ''}
                onChange={(e) => set('companyCui', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="co-hq">
              Adresa sediului (facturare) <span className="text-clay">*</span>
            </label>
            <textarea
              id="co-hq"
              rows={2}
              className={field}
              placeholder="Str. Exemplu nr. 1, București, Sector 1"
              value={value.companyAddress ?? ''}
              onChange={(e) => set('companyAddress', e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2.5 text-sm text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-clay shrink-0"
              checked={!!value.shippingSameAsBilling}
              onChange={(e) => set('shippingSameAsBilling', e.target.checked)}
            />
            <span>Livrarea se face la aceeași adresă cu cea de facturare</span>
          </label>
        </div>
      )}

      {/* Individuals always give a delivery address; companies only when it
          differs from the registered office. */}
      {(!isCompany || !value.shippingSameAsBilling) && (
        <div>
          <label className={label} htmlFor="co-ship">
            Adresa de livrare <span className="text-clay">*</span>
          </label>
          <textarea
            id="co-ship"
            rows={2}
            autoComplete="shipping street-address"
            className={field}
            placeholder="Str. Exemplu nr. 1, bl. A, ap. 2, localitate, județ, cod poștal"
            value={value.shippingAddress ?? ''}
            onChange={(e) => set('shippingAddress', e.target.value)}
          />
        </div>
      )}
    </section>
  );
}
