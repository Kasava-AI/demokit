/**
 * Correlated Address Data
 *
 * Provides realistic, correlated address data for multi-country support.
 * Each location entry contains city, state/province, country, and valid postal code ranges.
 */

export interface AddressLocation {
  city: string
  state: string // State, province, or region abbreviation
  stateFull: string // Full state/province name
  country: string
  countryCode: string // ISO 3166-1 alpha-2
  postalCodeFormat: string // Regex pattern for validation
  postalCodePrefix: string // Typical prefix for this area
  timezone?: string
}

export interface GeneratedAddress {
  line1: string
  line2?: string
  city: string
  state: string
  stateFull: string
  country: string
  countryCode: string
  postalCode: string
  formatted: string
}

// Street names that work across English-speaking countries
const STREET_NAMES = [
  'Main', 'Oak', 'Park', 'Cedar', 'Maple', 'Pine', 'Elm', 'Washington',
  'Lincoln', 'Lake', 'Hill', 'River', 'Forest', 'Spring', 'Valley',
  'Church', 'Mill', 'School', 'North', 'South', 'East', 'West',
  'Highland', 'Sunset', 'Willow', 'Meadow', 'Bridge', 'Grove', 'Garden',
]

const STREET_TYPES = {
  US: ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way', 'Ct', 'Pl', 'Rd', 'Cir'],
  UK: ['Street', 'Road', 'Lane', 'Avenue', 'Close', 'Drive', 'Way', 'Place', 'Crescent', 'Gardens'],
  CA: ['St', 'Ave', 'Blvd', 'Dr', 'Rd', 'Way', 'Cres', 'Pl', 'Ct', 'Lane'],
  AU: ['St', 'Ave', 'Rd', 'Dr', 'Ct', 'Cl', 'Cres', 'Pde', 'Tce', 'Way'],
  DE: ['Straße', 'Weg', 'Allee', 'Platz', 'Ring', 'Gasse', 'Damm', 'Ufer'],
}

// Apartment/unit designators by country
const UNIT_TYPES = {
  US: ['Apt', 'Suite', 'Unit', '#'],
  UK: ['Flat', 'Unit', 'Suite'],
  CA: ['Apt', 'Suite', 'Unit', '#'],
  AU: ['Unit', 'Apt', 'Suite', 'Level'],
  DE: ['Wohnung', 'Etage'],
}

/**
 * United States Locations
 * Major cities with accurate state mappings and zip code prefixes
 */
export const US_LOCATIONS: AddressLocation[] = [
  // New York
  { city: 'New York', state: 'NY', stateFull: 'New York', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '100', timezone: 'America/New_York' },
  { city: 'Brooklyn', state: 'NY', stateFull: 'New York', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '112', timezone: 'America/New_York' },
  { city: 'Buffalo', state: 'NY', stateFull: 'New York', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '142', timezone: 'America/New_York' },
  // California
  { city: 'Los Angeles', state: 'CA', stateFull: 'California', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '900', timezone: 'America/Los_Angeles' },
  { city: 'San Francisco', state: 'CA', stateFull: 'California', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '941', timezone: 'America/Los_Angeles' },
  { city: 'San Diego', state: 'CA', stateFull: 'California', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '921', timezone: 'America/Los_Angeles' },
  { city: 'San Jose', state: 'CA', stateFull: 'California', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '951', timezone: 'America/Los_Angeles' },
  // Texas
  { city: 'Houston', state: 'TX', stateFull: 'Texas', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '770', timezone: 'America/Chicago' },
  { city: 'Dallas', state: 'TX', stateFull: 'Texas', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '752', timezone: 'America/Chicago' },
  { city: 'Austin', state: 'TX', stateFull: 'Texas', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '787', timezone: 'America/Chicago' },
  { city: 'San Antonio', state: 'TX', stateFull: 'Texas', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '782', timezone: 'America/Chicago' },
  // Illinois
  { city: 'Chicago', state: 'IL', stateFull: 'Illinois', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '606', timezone: 'America/Chicago' },
  // Arizona
  { city: 'Phoenix', state: 'AZ', stateFull: 'Arizona', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '850', timezone: 'America/Phoenix' },
  // Pennsylvania
  { city: 'Philadelphia', state: 'PA', stateFull: 'Pennsylvania', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '191', timezone: 'America/New_York' },
  { city: 'Pittsburgh', state: 'PA', stateFull: 'Pennsylvania', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '152', timezone: 'America/New_York' },
  // Florida
  { city: 'Miami', state: 'FL', stateFull: 'Florida', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '331', timezone: 'America/New_York' },
  { city: 'Orlando', state: 'FL', stateFull: 'Florida', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '328', timezone: 'America/New_York' },
  { city: 'Tampa', state: 'FL', stateFull: 'Florida', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '336', timezone: 'America/New_York' },
  // Washington
  { city: 'Seattle', state: 'WA', stateFull: 'Washington', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '981', timezone: 'America/Los_Angeles' },
  // Massachusetts
  { city: 'Boston', state: 'MA', stateFull: 'Massachusetts', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '021', timezone: 'America/New_York' },
  // Colorado
  { city: 'Denver', state: 'CO', stateFull: 'Colorado', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '802', timezone: 'America/Denver' },
  // Georgia
  { city: 'Atlanta', state: 'GA', stateFull: 'Georgia', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '303', timezone: 'America/New_York' },
  // Nevada
  { city: 'Las Vegas', state: 'NV', stateFull: 'Nevada', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '891', timezone: 'America/Los_Angeles' },
  // Oregon
  { city: 'Portland', state: 'OR', stateFull: 'Oregon', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '972', timezone: 'America/Los_Angeles' },
  // Minnesota
  { city: 'Minneapolis', state: 'MN', stateFull: 'Minnesota', country: 'United States', countryCode: 'US', postalCodeFormat: '^\\d{5}(-\\d{4})?$', postalCodePrefix: '554', timezone: 'America/Chicago' },
]

/**
 * Canada Locations
 * Major cities with province mappings and postal code prefixes
 */
export const CA_LOCATIONS: AddressLocation[] = [
  // Ontario
  { city: 'Toronto', state: 'ON', stateFull: 'Ontario', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'M5', timezone: 'America/Toronto' },
  { city: 'Ottawa', state: 'ON', stateFull: 'Ontario', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'K1', timezone: 'America/Toronto' },
  { city: 'Mississauga', state: 'ON', stateFull: 'Ontario', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'L5', timezone: 'America/Toronto' },
  // British Columbia
  { city: 'Vancouver', state: 'BC', stateFull: 'British Columbia', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'V6', timezone: 'America/Vancouver' },
  { city: 'Victoria', state: 'BC', stateFull: 'British Columbia', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'V8', timezone: 'America/Vancouver' },
  // Quebec
  { city: 'Montreal', state: 'QC', stateFull: 'Quebec', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'H3', timezone: 'America/Montreal' },
  { city: 'Quebec City', state: 'QC', stateFull: 'Quebec', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'G1', timezone: 'America/Montreal' },
  // Alberta
  { city: 'Calgary', state: 'AB', stateFull: 'Alberta', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'T2', timezone: 'America/Edmonton' },
  { city: 'Edmonton', state: 'AB', stateFull: 'Alberta', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'T5', timezone: 'America/Edmonton' },
  // Manitoba
  { city: 'Winnipeg', state: 'MB', stateFull: 'Manitoba', country: 'Canada', countryCode: 'CA', postalCodeFormat: '^[A-Z]\\d[A-Z] ?\\d[A-Z]\\d$', postalCodePrefix: 'R3', timezone: 'America/Winnipeg' },
]

/**
 * United Kingdom Locations
 * Major cities with county/region and postcode prefixes
 */
export const UK_LOCATIONS: AddressLocation[] = [
  // England
  { city: 'London', state: 'Greater London', stateFull: 'Greater London', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'W1', timezone: 'Europe/London' },
  { city: 'Manchester', state: 'Greater Manchester', stateFull: 'Greater Manchester', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'M1', timezone: 'Europe/London' },
  { city: 'Birmingham', state: 'West Midlands', stateFull: 'West Midlands', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'B1', timezone: 'Europe/London' },
  { city: 'Liverpool', state: 'Merseyside', stateFull: 'Merseyside', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'L1', timezone: 'Europe/London' },
  { city: 'Leeds', state: 'West Yorkshire', stateFull: 'West Yorkshire', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'LS1', timezone: 'Europe/London' },
  { city: 'Bristol', state: 'Bristol', stateFull: 'City of Bristol', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'BS1', timezone: 'Europe/London' },
  { city: 'Cambridge', state: 'Cambridgeshire', stateFull: 'Cambridgeshire', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'CB1', timezone: 'Europe/London' },
  { city: 'Oxford', state: 'Oxfordshire', stateFull: 'Oxfordshire', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'OX1', timezone: 'Europe/London' },
  // Scotland
  { city: 'Edinburgh', state: 'Edinburgh', stateFull: 'City of Edinburgh', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'EH1', timezone: 'Europe/London' },
  { city: 'Glasgow', state: 'Glasgow', stateFull: 'City of Glasgow', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'G1', timezone: 'Europe/London' },
  // Wales
  { city: 'Cardiff', state: 'Cardiff', stateFull: 'Cardiff', country: 'United Kingdom', countryCode: 'GB', postalCodeFormat: '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$', postalCodePrefix: 'CF1', timezone: 'Europe/London' },
]

/**
 * Australia Locations
 * Major cities with state mappings and postcode ranges
 */
export const AU_LOCATIONS: AddressLocation[] = [
  // New South Wales
  { city: 'Sydney', state: 'NSW', stateFull: 'New South Wales', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '2000', timezone: 'Australia/Sydney' },
  { city: 'Newcastle', state: 'NSW', stateFull: 'New South Wales', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '2300', timezone: 'Australia/Sydney' },
  // Victoria
  { city: 'Melbourne', state: 'VIC', stateFull: 'Victoria', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '3000', timezone: 'Australia/Melbourne' },
  { city: 'Geelong', state: 'VIC', stateFull: 'Victoria', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '3220', timezone: 'Australia/Melbourne' },
  // Queensland
  { city: 'Brisbane', state: 'QLD', stateFull: 'Queensland', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '4000', timezone: 'Australia/Brisbane' },
  { city: 'Gold Coast', state: 'QLD', stateFull: 'Queensland', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '4217', timezone: 'Australia/Brisbane' },
  // Western Australia
  { city: 'Perth', state: 'WA', stateFull: 'Western Australia', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '6000', timezone: 'Australia/Perth' },
  // South Australia
  { city: 'Adelaide', state: 'SA', stateFull: 'South Australia', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '5000', timezone: 'Australia/Adelaide' },
  // Tasmania
  { city: 'Hobart', state: 'TAS', stateFull: 'Tasmania', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '7000', timezone: 'Australia/Hobart' },
  // ACT
  { city: 'Canberra', state: 'ACT', stateFull: 'Australian Capital Territory', country: 'Australia', countryCode: 'AU', postalCodeFormat: '^\\d{4}$', postalCodePrefix: '2600', timezone: 'Australia/Sydney' },
]

/**
 * Germany Locations
 * Major cities with Bundesland (federal state) and PLZ (postal code) prefixes
 */
export const DE_LOCATIONS: AddressLocation[] = [
  // Berlin
  { city: 'Berlin', state: 'BE', stateFull: 'Berlin', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '10115', timezone: 'Europe/Berlin' },
  // Bavaria
  { city: 'Munich', state: 'BY', stateFull: 'Bavaria', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '80331', timezone: 'Europe/Berlin' },
  { city: 'Nuremberg', state: 'BY', stateFull: 'Bavaria', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '90402', timezone: 'Europe/Berlin' },
  // Hamburg
  { city: 'Hamburg', state: 'HH', stateFull: 'Hamburg', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '20095', timezone: 'Europe/Berlin' },
  // Hesse
  { city: 'Frankfurt', state: 'HE', stateFull: 'Hesse', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '60311', timezone: 'Europe/Berlin' },
  // North Rhine-Westphalia
  { city: 'Cologne', state: 'NW', stateFull: 'North Rhine-Westphalia', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '50667', timezone: 'Europe/Berlin' },
  { city: 'Düsseldorf', state: 'NW', stateFull: 'North Rhine-Westphalia', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '40213', timezone: 'Europe/Berlin' },
  { city: 'Dortmund', state: 'NW', stateFull: 'North Rhine-Westphalia', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '44135', timezone: 'Europe/Berlin' },
  // Baden-Württemberg
  { city: 'Stuttgart', state: 'BW', stateFull: 'Baden-Württemberg', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '70173', timezone: 'Europe/Berlin' },
  // Saxony
  { city: 'Dresden', state: 'SN', stateFull: 'Saxony', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '01067', timezone: 'Europe/Berlin' },
  { city: 'Leipzig', state: 'SN', stateFull: 'Saxony', country: 'Germany', countryCode: 'DE', postalCodeFormat: '^\\d{5}$', postalCodePrefix: '04109', timezone: 'Europe/Berlin' },
]

/**
 * All locations combined, indexed by country code
 */
export const ALL_LOCATIONS: Record<string, AddressLocation[]> = {
  US: US_LOCATIONS,
  CA: CA_LOCATIONS,
  GB: UK_LOCATIONS,
  AU: AU_LOCATIONS,
  DE: DE_LOCATIONS,
}

/**
 * Flat array of all locations for random selection
 */
export const LOCATIONS_FLAT: AddressLocation[] = [
  ...US_LOCATIONS,
  ...CA_LOCATIONS,
  ...UK_LOCATIONS,
  ...AU_LOCATIONS,
  ...DE_LOCATIONS,
]

/**
 * Get street types for a given country code
 */
export function getStreetTypes(countryCode: string): string[] {
  return STREET_TYPES[countryCode as keyof typeof STREET_TYPES] ?? STREET_TYPES.US
}

/**
 * Get unit types for a given country code
 */
export function getUnitTypes(countryCode: string): string[] {
  return UNIT_TYPES[countryCode as keyof typeof UNIT_TYPES] ?? UNIT_TYPES.US
}

/**
 * Get street names (universal)
 */
export function getStreetNames(): string[] {
  return STREET_NAMES
}

/**
 * Generate a postal code for a given location
 */
export function generatePostalCode(location: AddressLocation, seed: number): string {
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000
    return x - Math.floor(x)
  }

  const { countryCode, postalCodePrefix } = location

  switch (countryCode) {
    case 'US': {
      // US ZIP: 5 digits, use prefix + random suffix
      const prefix = postalCodePrefix.slice(0, 3)
      const suffix = String(Math.floor(seededRandom(seed) * 100)).padStart(2, '0')
      return `${prefix}${suffix}`
    }
    case 'CA': {
      // Canadian postal code: A1A 1A1 format
      const letters = 'ABCEGHJKLMNPRSTVWXYZ' // Valid Canadian postal code letters
      const prefix = postalCodePrefix
      const digit1 = Math.floor(seededRandom(seed) * 10)
      const letter1 = letters[Math.floor(seededRandom(seed + 1) * letters.length)]
      const digit2 = Math.floor(seededRandom(seed + 2) * 10)
      return `${prefix}${digit1} ${letter1}${digit2}${letters[Math.floor(seededRandom(seed + 3) * letters.length)]}`
    }
    case 'GB': {
      // UK postcode: prefix + digit + letter + space + digit + 2 letters
      const prefix = postalCodePrefix
      const letters = 'ABDEFGHJLNPQRSTUWXYZ'
      const digit = Math.floor(seededRandom(seed) * 10)
      const letter1 = letters[Math.floor(seededRandom(seed + 1) * letters.length)]
      const letter2 = letters[Math.floor(seededRandom(seed + 2) * letters.length)]
      return `${prefix} ${digit}${letter1}${letter2}`
    }
    case 'AU': {
      // Australian postcode: 4 digits based on prefix
      return postalCodePrefix
    }
    case 'DE': {
      // German PLZ: 5 digits based on prefix
      return postalCodePrefix
    }
    default:
      return postalCodePrefix
  }
}

/**
 * Generate a complete correlated address
 */
export function generateCorrelatedAddress(
  index: number,
  seed: number = 0,
  options: {
    countryCode?: string
    includeUnit?: boolean
  } = {}
): GeneratedAddress {
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000
    return x - Math.floor(x)
  }

  const combinedSeed = seed + index * 7919 // Prime multiplier for variety

  // Select country (if not specified, weight towards US)
  let locations: AddressLocation[]
  if (options.countryCode && ALL_LOCATIONS[options.countryCode]) {
    locations = ALL_LOCATIONS[options.countryCode]
  } else {
    // Weight selection: 50% US, 15% each for CA/UK, 10% each for AU/DE
    const rand = seededRandom(combinedSeed)
    if (rand < 0.5) {
      locations = US_LOCATIONS
    } else if (rand < 0.65) {
      locations = CA_LOCATIONS
    } else if (rand < 0.8) {
      locations = UK_LOCATIONS
    } else if (rand < 0.9) {
      locations = AU_LOCATIONS
    } else {
      locations = DE_LOCATIONS
    }
  }

  // Select a location from the pool
  const locationIndex = Math.floor(seededRandom(combinedSeed + 1) * locations.length)
  const location = locations[locationIndex]

  // Generate street address
  const streetNumber = 100 + Math.floor(seededRandom(combinedSeed + 2) * 9900)
  const streetNameIndex = Math.floor(seededRandom(combinedSeed + 3) * STREET_NAMES.length)
  const streetName = STREET_NAMES[streetNameIndex]
  const streetTypes = getStreetTypes(location.countryCode)
  const streetTypeIndex = Math.floor(seededRandom(combinedSeed + 4) * streetTypes.length)
  const streetType = streetTypes[streetTypeIndex]

  // Generate line1
  let line1: string
  if (location.countryCode === 'DE') {
    // German format: Street Name + Number
    line1 = `${streetName}${streetType} ${streetNumber}`
  } else {
    // Standard format: Number + Street Name + Type
    line1 = `${streetNumber} ${streetName} ${streetType}`
  }

  // Optionally generate unit/apartment
  let line2: string | undefined
  if (options.includeUnit || seededRandom(combinedSeed + 5) < 0.3) {
    const unitTypes = getUnitTypes(location.countryCode)
    const unitType = unitTypes[Math.floor(seededRandom(combinedSeed + 6) * unitTypes.length)]
    const unitNumber = Math.floor(seededRandom(combinedSeed + 7) * 500) + 1
    line2 = `${unitType} ${unitNumber}`
  }

  // Generate postal code
  const postalCode = generatePostalCode(location, combinedSeed + 8)

  // Build formatted address
  let formatted: string
  if (location.countryCode === 'GB') {
    // UK format
    formatted = line2
      ? `${line2}, ${line1}\n${location.city}\n${location.state}\n${postalCode}`
      : `${line1}\n${location.city}\n${location.state}\n${postalCode}`
  } else if (location.countryCode === 'DE') {
    // German format
    formatted = line2
      ? `${line1}, ${line2}\n${postalCode} ${location.city}\n${location.country}`
      : `${line1}\n${postalCode} ${location.city}\n${location.country}`
  } else {
    // Standard US/CA/AU format
    formatted = line2
      ? `${line1}\n${line2}\n${location.city}, ${location.state} ${postalCode}\n${location.country}`
      : `${line1}\n${location.city}, ${location.state} ${postalCode}\n${location.country}`
  }

  return {
    line1,
    line2,
    city: location.city,
    state: location.state,
    stateFull: location.stateFull,
    country: location.country,
    countryCode: location.countryCode,
    postalCode,
    formatted,
  }
}

/**
 * Generate multiple correlated addresses
 */
export function generateCorrelatedAddresses(
  count: number,
  seed: number = 0,
  options: {
    countryCode?: string
    includeUnit?: boolean
  } = {}
): GeneratedAddress[] {
  const addresses: GeneratedAddress[] = []
  for (let i = 0; i < count; i++) {
    addresses.push(generateCorrelatedAddress(i, seed, options))
  }
  return addresses
}

/**
 * Validate a postal code against a location's expected format
 */
export function validatePostalCode(postalCode: string, countryCode: string): boolean {
  const locations = ALL_LOCATIONS[countryCode]
  if (!locations || locations.length === 0) return false

  const format = locations[0].postalCodeFormat
  const regex = new RegExp(format, 'i')
  return regex.test(postalCode)
}
