class RedshiftRouter:
    """
    Route dashboard app queries to Redshift
    """

    route_app_labels = {"dashboard"}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return "redshift"
        return "default"

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return "redshift"
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, **hints):
        if app_label in self.route_app_labels:
            return db == "redshift"
        return db == "default"