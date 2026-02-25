-- Content Materials: 소재 추천 기능 추가
ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]';
ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS selected_image_index integer;
