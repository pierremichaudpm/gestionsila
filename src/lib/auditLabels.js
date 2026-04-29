// Libellés humains pour les colonnes auditées par le trigger
// track_imported_changes. Utilisés par ModifiedBadge pour afficher des
// tooltips lisibles (« Titre : … » plutôt que « title : … »).

export const MILESTONE_LABELS = {
  title:      'Titre',
  start_date: 'Date début',
  end_date:   'Date fin',
  type:       'Type',
  country:    'Pays',
  lot_id:     'Tableau',
  notes:      'Notes',
}

export const BUDGET_LINE_LABELS = {
  code:        'Code',
  category:    'Poste',
  planned:     'Prévu',
  actual:      'Réel',
  currency:    'Devise',
  lot_id:      'Tableau',
  cost_origin: 'Origine',
  org_id:      'Organisation',
}

export const FUNDING_SOURCE_LABELS = {
  country:     'Pays',
  source_name: 'Source',
  amount_eur:  'Montant EUR',
  amount_cad:  'Montant CAD',
  status:      'Statut',
  notes:       'Notes',
}

export const DOCUMENT_LABELS = {
  title:             'Titre',
  drive_url:         'URL Drive',
  folder:            'Sous-dossier',
  category:          'Catégorie',
  version:           'Version',
  lot_id:            'Tableau',
  country:           'Pays',
  validation_status: 'Statut',
}

export const PRODUCER_DOCUMENT_LABELS = {
  title:             'Titre',
  drive_url:         'URL Drive',
  folder:            'Sous-dossier',
  version:           'Version',
  version_devis:     'Version du devis',
  lot_id:            'Tableau',
  country:           'Pays',
  validation_status: 'Statut',
}
