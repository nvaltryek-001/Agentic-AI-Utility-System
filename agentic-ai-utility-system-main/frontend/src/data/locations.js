// Indian States, Districts and Cities data
export const locations = {
  "Maharashtra": {
    "Mumbai": ["Mumbai City", "Mumbai Suburban", "Thane", "Navi Mumbai"],
    "Pune": ["Pune City", "Pimpri-Chinchwad", "Khadki", "Dehu Road"],
    "Nagpur": ["Nagpur City", "Kamptee", "Hingna", "Umred"],
    "Nashik": ["Nashik City", "Malegaon", "Sinnar", "Igatpuri"],
    "Aurangabad": ["Aurangabad City", "Paithan", "Kannad", "Sillod"]
  },
  "Karnataka": {
    "Bangalore": ["Bangalore Urban", "Bangalore Rural", "Yelahanka", "Whitefield"],
    "Mysore": ["Mysore City", "Nanjangud", "Hunsur", "K.R. Nagar"],
    "Hubli-Dharwad": ["Hubli", "Dharwad", "Navalgund", "Kundgol"],
    "Mangalore": ["Mangalore City", "Ullal", "Puttur", "Bantwal"],
    "Belgaum": ["Belgaum City", "Gokak", "Chikkodi", "Athani"]
  },
  "Tamil Nadu": {
    "Chennai": ["Chennai North", "Chennai South", "Chennai Central", "Ambattur"],
    "Coimbatore": ["Coimbatore North", "Coimbatore South", "Pollachi", "Mettupalayam"],
    "Madurai": ["Madurai North", "Madurai South", "Melur", "Usilampatti"],
    "Salem": ["Salem City", "Attur", "Mettur", "Edappadi"],
    "Trichy": ["Trichy City", "Srirangam", "Lalgudi", "Manapparai"]
  },
  "Delhi": {
    "New Delhi": ["New Delhi", "Connaught Place", "Chanakyapuri", "Parliament Street"],
    "North Delhi": ["Civil Lines", "Model Town", "Narela", "Alipur"],
    "South Delhi": ["Hauz Khas", "Defence Colony", "Greater Kailash", "Saket"],
    "East Delhi": ["Preet Vihar", "Gandhi Nagar", "Mayur Vihar", "Patparganj"],
    "West Delhi": ["Rajouri Garden", "Hari Nagar", "Tilak Nagar", "Janakpuri"]
  },
  "Telangana": {
    "Hyderabad": ["Hyderabad Central", "Secunderabad", "Kukatpally", "Gachibowli"],
    "Warangal": ["Warangal Urban", "Warangal Rural", "Kazipet", "Hanamkonda"],
    "Karimnagar": ["Karimnagar", "Jagtial", "Peddapalli", "Manthani"],
    "Nizamabad": ["Nizamabad", "Bodhan", "Armoor", "Kamareddy"],
    "Khammam": ["Khammam", "Kothagudem", "Madhira", "Sathupalli"]
  },
  "Gujarat": {
    "Ahmedabad": ["Ahmedabad City", "Daskroi", "Sanand", "Viramgam"],
    "Surat": ["Surat City", "Kamrej", "Palsana", "Bardoli"],
    "Vadodara": ["Vadodara City", "Padra", "Savli", "Karjan"],
    "Rajkot": ["Rajkot City", "Gondal", "Jetpur", "Upleta"],
    "Gandhinagar": ["Gandhinagar", "Kalol", "Dehgam", "Mansa"]
  },
  "West Bengal": {
    "Kolkata": ["Kolkata North", "Kolkata South", "Howrah", "Salt Lake"],
    "Siliguri": ["Siliguri", "Jalpaiguri", "Alipurduar", "Cooch Behar"],
    "Durgapur": ["Durgapur", "Asansol", "Bardhaman", "Raniganj"],
    "Darjeeling": ["Darjeeling", "Kurseong", "Mirik", "Kalimpong"],
  },
  "Rajasthan": {
    "Jaipur": ["Jaipur Urban", "Jaipur Rural", "Sanganer", "Amer"],
    "Jodhpur": ["Jodhpur North", "Jodhpur South", "Phalodi", "Nagaur"],
    "Udaipur": ["Udaipur City", "Rajsamand", "Banswara", "Chittorgarh"],
    "Kota": ["Kota North", "Kota South", "Bundi", "Baran"],
    "Bikaner": ["Bikaner City", "Sri Dungargarh", "Nokha", "Kolayat"]
  },
  "Uttar Pradesh": {
    "Lucknow": ["Lucknow Urban", "Lucknow Rural", "Mohanlalganj", "Bakshi Ka Talab"],
    "Kanpur": ["Kanpur Nagar", "Kanpur Dehat", "Unnao", "Akbarpur"],
    "Agra": ["Agra City", "Firozabad", "Mathura", "Mainpuri"],
    "Varanasi": ["Varanasi City", "Mirzapur", "Jaunpur", "Ghazipur"],
    "Ghaziabad": ["Ghaziabad", "Noida", "Greater Noida", "Hapur"]
  },
  "Kerala": {
    "Thiruvananthapuram": ["Thiruvananthapuram", "Nedumangad", "Neyyattinkara", "Attingal"],
    "Kochi": ["Ernakulam", "Kochi Corporation", "Aluva", "Kothamangalam"],
    "Kozhikode": ["Kozhikode", "Vadakara", "Koyilandy", "Thamarassery"],
    "Thrissur": ["Thrissur", "Kunnamkulam", "Chalakudy", "Irinjalakuda"],
    "Kollam": ["Kollam", "Karunagappally", "Kottarakkara", "Punalur"]
  }
};

// Get all states
export const getStates = () => Object.keys(locations);

// Get districts for a state
export const getDistricts = (state) => {
  if (!state || !locations[state]) return [];
  return Object.keys(locations[state]);
};

// Get cities for a district
export const getCities = (state, district) => {
  if (!state || !district || !locations[state] || !locations[state][district]) return [];
  return locations[state][district];
};

// Default coordinates for major cities (for map centering)
export const cityCoordinates = {
  "Mumbai City": { lat: 19.0760, lng: 72.8777 },
  "Pune City": { lat: 18.5204, lng: 73.8567 },
  "Bangalore Urban": { lat: 12.9716, lng: 77.5946 },
  "Chennai North": { lat: 13.0827, lng: 80.2707 },
  "New Delhi": { lat: 28.6139, lng: 77.2090 },
  "Hyderabad Central": { lat: 17.3850, lng: 78.4867 },
  "Ahmedabad City": { lat: 23.0225, lng: 72.5714 },
  "Kolkata North": { lat: 22.5726, lng: 88.3639 },
  "Jaipur Urban": { lat: 26.9124, lng: 75.7873 },
  "Lucknow Urban": { lat: 26.8467, lng: 80.9462 },
  "Thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "Ernakulam": { lat: 9.9816, lng: 76.2999 }
};

// Get coordinates for a city
export const getCityCoordinates = (city) => {
  return cityCoordinates[city] || { lat: 20.5937, lng: 78.9629 }; // Default to India center
};
