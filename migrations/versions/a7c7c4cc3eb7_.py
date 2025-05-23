"""empty message

Revision ID: a7c7c4cc3eb7
Revises: 261276e86f3b
Create Date: 2025-04-08 18:54:33.321012

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7c7c4cc3eb7'
down_revision = '261276e86f3b'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('message', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sender_id', sa.Integer(), nullable=False))
        batch_op.alter_column('receiver_id',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.create_foreign_key('fk_message_sender', 'user', ['sender_id'], ['id'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('message', schema=None) as batch_op:
        batch_op.drop_constraint('fk_message_sender', type_='foreignkey')
        batch_op.alter_column('receiver_id',
               existing_type=sa.INTEGER(),
               nullable=True)
        batch_op.drop_column('sender_id')

    # ### end Alembic commands ###
