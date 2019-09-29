SELECT CONCAT ('INSERT INTO statistics (user_id, money, win_count, lose_count, "createdAt", "updatedAt") VALUES (',
               user_id, ', ',
               money, ', ',
               win_count, ', ',
               lose_count, ', ',
               'NOW(), NOW()'
               ');') FROM pokerpocket.users_statistics;

