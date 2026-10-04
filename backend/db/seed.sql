-- Starter category tree (organised: main category → sub categories). Everything is editable from the dashboard.
-- Idempotent: re-running never duplicates or overwrites.
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('أواني الطبخ',        'cookware',  'قدور وطناجر ومقالي لكل أنواع الطبخ', 10),
  ('أواني المائدة',       'tableware', 'صحون وكؤوس وأطقم تقديم لمائدة أنيقة', 20),
  ('أدوات المطبخ',        'kitchen-tools', 'كل ما تحتاجه للتحضير والتقطيع والتخزين', 30),
  ('الشاي والقهوة',      'tea-coffee', 'أطقم وأدوات لتحضير وتقديم الشاي والقهوة', 40),
  ('التنظيف والعناية',    'cleaning', 'مستلزمات التنظيف والعناية بالمنزل', 50),
  ('الديكور المنزلي',     'home-decor', 'قطع ديكور تضيف لمسة جمال لبيتك', 60)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, c.id, v.ord
FROM (VALUES
  ('طناجر وقدور',        'pots',          'cookware', 10),
  ('مقالي',              'pans',          'cookware', 20),
  ('أواني الضغط والكسكاس','pressure-couscous','cookware', 30),
  ('صحون وأطباق',        'plates',        'tableware', 10),
  ('كؤوس وأكواب',        'glasses-cups',  'tableware', 20),
  ('أطقم التقديم',        'serving-sets',  'tableware', 30),
  ('سكاكين وأدوات التقطيع','knives-cutting','kitchen-tools', 10),
  ('أدوات الخبز والحلويات','baking',        'kitchen-tools', 20),
  ('علب الحفظ والتخزين', 'storage',       'kitchen-tools', 30)
) AS v(name, slug, parent_slug, ord)
JOIN categories c ON c.slug = v.parent_slug
ON CONFLICT (slug) DO NOTHING;
