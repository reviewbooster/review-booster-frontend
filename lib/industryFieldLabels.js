/**
 * lib/industryFieldLabels.js
 * Makes the existing customer Notes field feel business-type-aware without
 * adding any new schema field -- same storage, same field, just a label and
 * placeholder that fit the business. Falls back to plain "Notes" for any
 * type not listed (and for 'other').
 */
var NOTES_LABELS = {
  salon:       { label: 'Service notes',          placeholder: 'e.g. Last cut: fade, prefers early morning slots' },
  barbershop:  { label: 'Service notes',           placeholder: 'e.g. Usual style, preferred barber' },
  gym:         { label: 'Membership notes',        placeholder: 'e.g. Membership type, fitness goals' },
  dental:      { label: 'Visit notes',              placeholder: 'e.g. Last treatment, next checkup due' },
  clinic:      { label: 'Visit notes',              placeholder: 'e.g. Last visit reason, follow-up needed' },
  restaurant:  { label: 'Preferences',              placeholder: 'e.g. Favorite dish, dietary notes, special occasions' },
  retail:      { label: 'Preferences',              placeholder: 'e.g. Product interests, sizes, past purchases' },
  auto:        { label: 'Vehicle & service notes',  placeholder: 'e.g. Vehicle model, next service due' },
  real_estate: { label: 'Property notes',           placeholder: 'e.g. Property interest, budget range' },
  education:   { label: 'Program notes',            placeholder: 'e.g. Course enrolled, progress notes' },
  pet_care:    { label: 'Pet notes',                placeholder: "e.g. Pet name & breed, next grooming due" },
};

var DEFAULT_NOTES = { label: 'Notes', placeholder: 'Any notes about this customer...' };

export function getNotesLabel(businessType) {
  return NOTES_LABELS[businessType] || DEFAULT_NOTES;
}
