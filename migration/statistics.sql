/*
Use this script to create insert scripts from mysql to postgresql
when updating new version to production
*/

SELECT CONCAT ('INSERT INTO statistics (user_id, money, win_count, lose_count, "createdAt", "updatedAt") VALUES (',
               user_id, ', ',
               money, ', ',
               win_count, ', ',
               lose_count, ', ',
               'NOW(), NOW()'
               ');') FROM pokerpocket.users_statistics;

