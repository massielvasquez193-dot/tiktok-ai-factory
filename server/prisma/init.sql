-- TikTok AI Video Factory — Database Initialization
-- Auto-executed by PostgreSQL container on first run

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create index for full-text search on products
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_country ON products (country);

-- Campaign indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_product ON campaigns (product_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns (created_at DESC);

-- Script indexes
CREATE INDEX IF NOT EXISTS idx_scripts_product ON scripts (product_id);
CREATE INDEX IF NOT EXISTS idx_scripts_type_lang ON scripts (script_type, language);

-- Video indexes
CREATE INDEX IF NOT EXISTS idx_videos_campaign ON videos (campaign_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos (status);

-- Viral video indexes
CREATE INDEX IF NOT EXISTS idx_viral_videos_keyword ON viral_videos (keyword);
CREATE INDEX IF NOT EXISTS idx_viral_videos_platform ON viral_videos (platform);
CREATE INDEX IF NOT EXISTS idx_viral_videos_views ON viral_videos (views DESC);

-- Insert sample data for testing
INSERT INTO products (id, name, category, price, offer, sales_page, country, persona, status, brief, created_at, updated_at)
VALUES (
  'sample-blendjet',
  'BlendJet 2 Portable Blender',
  'Portable Blender',
  '$49.99',
  '15% off with code SMOOTHIE15',
  'https://example.com/blendjet2',
  'US',
  'Busy professionals and fitness enthusiasts, 22-40',
  'active',
  '{"product":{"name":"BlendJet 2 Portable Blender","category":"Portable Blender","price":"$49.99","offer":"15% off with code SMOOTHIE15","target_country":"US"},"audience":{"persona":"Busy professionals and fitness enthusiasts","pain_points":["No time to make breakfast","Bulky blenders are a hassle","Need post-workout shakes"]},"creative":{"language":"English","duration_seconds":25,"aspect_ratio":"9:16"}}',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;
