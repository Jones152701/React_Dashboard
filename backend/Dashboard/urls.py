from django.urls import path
from .views import SocialMediaDailyView,LensAnalyticsView,ComptitorsView

urlpatterns = [
    path('social_media/', SocialMediaDailyView.as_view(), name='social_media_daily'),
    path('LensOverview/LensAnalytics',LensAnalyticsView.as_view(),name='lensanalytics'),
    path('competitors-plan',ComptitorsView.as_view(),name='competitorsplan')
]