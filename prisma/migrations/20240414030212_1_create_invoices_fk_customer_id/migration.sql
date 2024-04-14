-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fk_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
