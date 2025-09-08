import Head from 'next/head';
import React from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: any;
}

// Default SEO configuration
const DEFAULT_SEO = {
  title: 'RAPEX - Your One-Stop E-Commerce Platform',
  description: 'RAPEX offers ride hailing, food delivery, and product delivery services. Join our platform for seamless e-commerce solutions.',
  keywords: 'rapex, e-commerce, ride hailing, food delivery, product delivery, marketplace',
  ogImage: '/assets/rapexlogosquare.png',
  ogType: 'website'
};

export function SEOHead({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  ogType, 
  canonicalUrl,
  noindex = false,
  structuredData 
}: SEOProps) {
  const seoTitle = title ? `${title} | RAPEX` : DEFAULT_SEO.title;
  const seoDescription = description || DEFAULT_SEO.description;
  const seoKeywords = keywords || DEFAULT_SEO.keywords;
  const seoOgImage = ogImage || DEFAULT_SEO.ogImage;
  const seoOgType = ogType || DEFAULT_SEO.ogType;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoOgImage} />
      <meta property="og:type" content={seoOgType} />
      <meta property="og:site_name" content="RAPEX" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoOgImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
}

// Generate structured data for different page types
export function generateOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RAPEX",
    "description": "Your One-Stop E-Commerce Platform for ride hailing, food delivery, and product delivery",
    "url": typeof window !== 'undefined' ? window.location.origin : '',
    "logo": "/assets/rapexlogosquare.png",
    "sameAs": [
      // Add social media URLs here when available
    ]
  };
}

export function generateWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "RAPEX",
    "description": "Your One-Stop E-Commerce Platform",
    "url": typeof window !== 'undefined' ? window.location.origin : '',
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

export function generateBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": breadcrumb.name,
      "item": breadcrumb.url
    }))
  };
}

// Page-specific SEO configurations
export const PAGE_SEO = {
  home: {
    title: 'Home',
    description: 'Welcome to RAPEX - Your one-stop e-commerce platform for ride hailing, food delivery, and product delivery services.',
    keywords: 'rapex, home, e-commerce platform, ride hailing, food delivery'
  },
  merchantLogin: {
    title: 'Merchant Login',
    description: 'Access your RAPEX merchant dashboard to manage your business, products, and orders.',
    keywords: 'merchant login, business dashboard, rapex merchant'
  },
  adminLogin: {
    title: 'Admin Login',
    description: 'Access the RAPEX administration panel to manage the platform.',
    keywords: 'admin login, administration, platform management'
  },
  merchantDashboard: {
    title: 'Merchant Dashboard',
    description: 'Manage your business on RAPEX platform. View analytics, manage products, and track orders.',
    keywords: 'merchant dashboard, business management, analytics'
  },
  products: {
    title: 'Product Management',
    description: 'Manage your product catalog, add new products, and update inventory.',
    keywords: 'product management, inventory, catalog'
  }
};

export default SEOHead;
