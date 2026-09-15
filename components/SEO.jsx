import Head from 'next/head';

const SITE_URL = 'https://reviewbooster.adcend.in';
const DEFAULT_TITLE = 'ReviewBooster — Collect Reviews & Grow Referrals';
const DEFAULT_DESCRIPTION = 'Collect reviews, resolve feedback, and grow referrals — all in one place.';
const DEFAULT_OG_IMAGE = SITE_URL + '/og-image.jpg';

export default function SEO({ title, description, path, noindex }) {
  const fullTitle = title ? (title + ' | ReviewBooster') : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = path ? (SITE_URL + path) : SITE_URL;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
    </Head>
  );
}
