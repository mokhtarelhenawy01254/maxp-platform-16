WITH dups AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY "recipientFacebookId", date_trunc('day', "sentAt")
               ORDER BY (CASE WHEN "messageStatus" = 'saved' THEN 1 ELSE 2 END) ASC, "sentAt" ASC
           ) as row_num
    FROM sent_message_stats
)
DELETE FROM sent_message_stats
WHERE id IN (
    SELECT id FROM dups WHERE row_num > 1
);
