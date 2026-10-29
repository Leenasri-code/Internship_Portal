// Skill sets for the profile skill autocomplete (from the original static/profile/profile.js).
export const SKILL_SETS = {
  business_analyst: {
    hard: ['excel', 'sql', 'tableau', 'power bi', 'sas', 'r', 'statistics', 'financial modeling', 'data visualization', 'reporting'],
    domain: ['finance', 'banking', 'insurance', 'healthcare', 'supply chain', 'marketing', 'operations'],
    soft: ['communication', 'stakeholder management', 'problem solving', 'analytical thinking', 'documentation'],
  },
  data_analyst: {
    hard: ['sql', 'python', 'pandas', 'numpy', 'excel', 'tableau', 'power bi', 'looker', 'r', 'statistics', 'data cleaning', 'etl'],
    domain: ['retail', 'e-commerce', 'marketing', 'healthcare', 'operations'],
    soft: ['attention to detail', 'visualization storytelling', 'collaboration', 'critical thinking'],
  },
  data_engineer: {
    hard: ['python', 'sql', 'java', 'scala', 'spark', 'hadoop', 'kafka', 'airflow', 'dbt', 'snowflake', 'redshift', 'bigquery', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'etl', 'data warehouse', 'pipelines'],
    domain: ['cloud', 'streaming', 'data pipelines', 'big data', 'healthcare', 'finance'],
    soft: ['problem solving', 'teamwork', 'ownership', 'documentation'],
  },
  data_scientist: {
    hard: ['python', 'r', 'sql', 'machine learning', 'deep learning', 'nlp', 'tensorflow', 'pytorch', 'scikit-learn', 'statistics', 'probability', 'optimization', 'time series', 'computer vision'],
    domain: ['ai', 'healthcare', 'finance', 'retail', 'predictive analytics', 'genai'],
    soft: ['critical thinking', 'research mindset', 'communication', 'problem solving'],
  },
};

// Flatten + de-duplicate + sort (same as the original).
export const ALL_SKILLS = Array.from(
  new Set(Object.values(SKILL_SETS).flatMap((role) => Object.values(role).flat()))
).sort();
