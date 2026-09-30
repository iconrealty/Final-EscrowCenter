import React from 'react';
import { Listing } from '../../types';
import { DocumentsSection } from '../modals/DocumentsSection';

interface ListingDocumentsSectionProps {
  listing: Listing;
  onUpdate: (data: Partial<Listing>) => void;
}

export function ListingDocumentsSection({ listing, onUpdate }: ListingDocumentsSectionProps) {
  return (
    <DocumentsSection 
      listing={listing}
      onUpdate={onUpdate}
    />
  );
}
