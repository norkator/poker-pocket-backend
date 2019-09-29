/*
Use this script to create insert scripts from mysql to postgresql
when updating new version to production
*/

SELECT CONCAT ('INSERT INTO users (id, name, xp, money, win_count, lose_count, rew_ad_count, email, password, "createdAt", "updatedAt") VALUES (',
               id, ', ',
               '''',name, ''', ',
               xp, ', ',
               money, ', ',
               win_count, ', ',
               lose_count, ', ',
               rewadcount, ', ',
               '''',email, ''', ',
               '''',password, '''',
               ', NOW(), NOW()'
               ');') FROM pokerpocket.users;
