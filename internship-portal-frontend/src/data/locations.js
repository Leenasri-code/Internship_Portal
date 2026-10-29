// The original profile.js referenced a `countriesWithCities` object that was never defined,
// so the city dropdown could not populate. This list restores that behaviour for the
// five countries offered in the Country dropdown.
export const COUNTRIES = ['India', 'USA', 'UK', 'Australia', 'Japan'];

export const countriesWithCities = {
  India: ['Bengaluru', 'Chennai', 'Coimbatore', 'Delhi', 'Hyderabad', 'Kochi', 'Kolkata', 'Mumbai', 'Pune', 'Thiruvananthapuram', 'Ahmedabad', 'Jaipur'],
  USA: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Seattle', 'Boston', 'Austin'],
  UK: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Bristol'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo'],
};

// Country-code dropdown (value, label msgid, phone length) - from profile.html.
export const COUNTRY_CODES = [
  { value: '+91', label: 'India (+91)', length: 10 },
  { value: '+1', label: 'USA (+1)', length: 10 },
  { value: '+44', label: 'UK (+44)', length: 10 },
  { value: '+61', label: 'Australia (+61)', length: 9 },
  { value: '+81', label: 'Japan (+81)', length: 10 },
];
