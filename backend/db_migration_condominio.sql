-- Migração: adicionar campo condomínio aos usuários
-- Executar no MySQL: mysql -u engenharia_16 -p engenharia_16 < db_migration_condominio.sql

ALTER TABLE usuarios
    ADD COLUMN condominio VARCHAR(100) DEFAULT NULL
    AFTER bloco;
