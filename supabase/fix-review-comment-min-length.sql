-- Allow single-character and single-emoji reviews.
-- The previous constraint required >= 3 characters, rejecting valid
-- short inputs such as a single emoji (e.g. "👍") or a one-word reaction.
alter table public.product_reviews
  drop constraint if exists product_reviews_comment_check;

alter table public.product_reviews
  add constraint product_reviews_comment_check
  check (char_length(trim(comment)) >= 1);
