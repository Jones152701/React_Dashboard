class RedshiftRouter:
    """
    Route dashboard app to Redshift,
    everything else (auth, admin, sessions) to SQLite
    """

    route_app_labels = {"dashboard"}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return "default"   # Redshift
        return "sqlite"        # ✅ Force auth → SQLite

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return "default"
        return "sqlite"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, **hints):
        if app_label in self.route_app_labels:
            return db == "default"   # Redshift
        return db == "sqlite"       # ✅ Auth tables → SQLite