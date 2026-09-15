from django.contrib import admin
from .models import Channel, ChannelMember, Message

class ChannelMemberInline(admin.TabularInline):
    model = ChannelMember
    extra = 1

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('sender', 'content', 'created_at')

@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'type', 'created_by', 'created_at')
    list_filter = ('type',)
    search_fields = ('name', 'id')
    inlines = [ChannelMemberInline]

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'channel', 'sender', 'short_content', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('content', 'sender__username')
    
    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    short_content.short_description = 'Content'
