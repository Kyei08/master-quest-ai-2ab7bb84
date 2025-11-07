-- Drop and recreate view without security definer
DROP VIEW IF EXISTS public.content_quality_metrics;

CREATE VIEW public.content_quality_metrics AS
SELECT 
  a.id as content_id,
  'assignment' as content_type,
  a.module_id,
  m.topic as module_topic,
  a.content_status,
  a.average_rating,
  a.total_ratings,
  a.created_at,
  a.last_rated_at,
  COUNT(DISTINCT cr.id) as review_count,
  COUNT(DISTINCT CASE WHEN cr.status = 'flagged' THEN cr.id END) as flag_count,
  COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.id END) as approval_count,
  STRING_AGG(DISTINCT cr.feedback, ' | ') as recent_feedback
FROM public.assignments a
LEFT JOIN public.modules m ON m.id = a.module_id
LEFT JOIN public.content_reviews cr ON cr.content_id = a.id AND cr.content_type = 'assignment'
GROUP BY a.id, a.module_id, m.topic, a.content_status, a.average_rating, a.total_ratings, a.created_at, a.last_rated_at;